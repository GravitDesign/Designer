/**
     * The grid guide
     * @param {IFGuides} guides
     * @class GGridGuide
     * @extends IFGuide
     * @mixes IFGuide.Visual
     * @mixes IFGuide.Map
     * @constructor
     */

function GGridGuide() {
  // Constructor (reconstructed)
}

// Prototype methods
/** @override */
GGridGuide.prototype.map = function (x, y) {
          var i = null,
            n = this._scene.getProperty("gm");
          if (!n) return i;
          var r = n === o.GridMode.Axonometric,
            a = this._scene.getProperty(r ? "gaw" : "gx"),
            s = this._scene.getProperty(r ? "gah" : "gy");
          if (a >= 1 && s >= 1) {
            var l,
              h = Math.round(e / a) * a;
            if (n === o.GridMode.Boxed) l = Math.round(t / s) * s;
            else if (n === o.GridMode.Axonometric) {
              var A = this._scene.getProperty("ga2"),
                c = h * Math.tan(-A);
              (c -= Math.round(c / s) * s),
                (l = Math.round((t - c) / s) * s + c);
            }
            i = {
              x: {
                value: h,
                guide: null,
                delta: Math.abs(e - h),
              },
              y: {
                value: l,
                guide: null,
                delta: Math.abs(t - l),
              },
            };
          }
          return i;
        }

GGridGuide.prototype.canMapWithFullPixelsGuide = function () {
          var e = this._scene.getProperty("gm") === o.GridMode.Axonometric,
            t = this._scene.getProperty(e ? "gaw" : "gx"),
            i = this._scene.getProperty(e ? "gah" : "gy");
          return (
            (t > 1 && i > 1) ||
            (this._scene.getProperty("ut") !== A.Unit.PX && t >= 1 && i >= 1)
          );
        }

/** @override */
    IFGridGuide.prototype.isMappingAllowed = function () {
        return !ifPlatform.modifiers.metaKey;
    };

    /** @override */
GGridGuide.prototype.toString = function () {
          return "[Object GGridGuide]";
        }

module.exports = GGridGuide;
