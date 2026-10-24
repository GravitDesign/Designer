/**
 * GFullPixelsGuide
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GFullPixelsGuide(e) {
        n.call(this, e),
          this.getAllowedSnapZones().forEach(
            function (e) {
              e !== a.Side.TOP_LEFT && this.disallowSnapZone(e);
            }.bind(this)
          );
      }

GObject.inheritAndMix(GFullPixelsGuide, GGuide, [n.Map, n.DetailMap]);

// Prototype methods
GFullPixelsGuide.prototype.getId = function () {
          return h.ID;
        }

GFullPixelsGuide.prototype.map = function (e, t) {
          if (this._scene.getProperty("ut") === o.Unit.PX) {
            var i = l.round(e, !0),
              n = l.round(t, !0);
            return {
              x: {
                value: i,
                guide: null,
                delta: Math.abs(e - i),
              },
              y: {
                value: n,
                guide: null,
                delta: Math.abs(t - n),
              },
            };
          }
          return null;
        }

GFullPixelsGuide.prototype.isMappingAllowed = function (e) {
          return (
            !s.options.disabled && e !== n.DetailMap.Mode.DetailOffFilterOn
          );
        }

GFullPixelsGuide.prototype.isFullPixelsGuide = function () {
          return true;
        }

GFullPixelsGuide.prototype.toString = function () {
          return "[Object GFullPixelsGuide]";
        }


module.exports = GFullPixelsGuide;
