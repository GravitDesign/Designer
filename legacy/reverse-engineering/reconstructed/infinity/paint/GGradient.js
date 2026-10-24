/**
     * A class representing a color gradient
     * @class GGradient
     * @extends IFPattern
     * @constructor
     */

function GGradient() {
  // Constructor (reconstructed)
}

// Prototype methods
GGradient.prototype.deserialize = function (e) {
          var t = JSON.parse(e);
          t && this._deserializeFromBlob(t);
        }

GGradient.prototype.getScale = function () {
          return this._scale;
        }

GGradient.prototype.getTransform = function () {
          return this._transform;
        }

GGradient.prototype.setTransform = function (e) {
          this._transform = e;
        }

GGradient.prototype.toScreenCSS = function (e, t) {
          for (var i = this.getStops(), n = [], r = 0; r < i.length; ++r) {
            var o = i[r],
              a = o.opacity;
            "number" == typeof e && (a *= e),
              n.push(
                o.color.toScreenCSS(a, t) +
                  " " +
                  Math.round(100 * o.position) +
                  "%"
              );
          }
          return n.join(", ");
        }

GGradient.prototype.sortStops = function () {
          this._stops.sort(function (e, t) {
            return e.position < t.position
              ? -1
              : e.position > t.position
              ? 1
              : 0;
          });
        }

GGradient.prototype._serializeToBlob = function () {
          var e = {};
          this._scale && 1 !== this._scale && (e.s = this._scale),
            this._transform && (e.t = s.serialize(this._transform)),
            l.isEqualEps(this._fx, 0.5) || (e.fx = this._fx),
            l.isEqualEps(this._fy, 0.5) || (e.fy = this._fy),
            (e.x = []);
          for (var t = 0; t < this._stops.length; ++t) {
            var i = this._stops[t],
              r = {
                p: i.position,
                c: n.serialize(i.color),
                o: i.opacity,
              };
            1 !== i.opacity && (r.o = i.opacity), e.x.push(r);
          }
          return e;
        }

GGradient.prototype._deserializeFromBlob = function (e) {
          (this._scale = e.hasOwnProperty("s") ? e.s : 1),
            (this._fx = e.hasOwnProperty("fx") ? e.fx : 0.5),
            (this._fy = e.hasOwnProperty("fy") ? e.fy : 0.5),
            (this._transform = e.hasOwnProperty("t")
              ? s.deserialize(e.t)
              : null),
            (this._stops = []);
          for (var t = null, i = 0; i < e.x.length; ++i) {
            var r = e.x[i],
              o = {
                position: Math.min(1, Math.max(0, r.p)),
              },
              a = false;
            r.hasOwnProperty("c") &&
              ((o.color = n.deserialize(r.c)),
              r.hasOwnProperty("o")
                ? ((o.opacity = r.o), (a = true))
                : (o.opacity = 1),
              this._stops.push(o)),
              !a &&
                r.hasOwnProperty("o") &&
                ((o.opacity = r.o), t || (t = []), t.push(o));
          }
          if (t)
            for (i = 0; i < t.length; ++i)
              for (
                var h = t[i].position, A = t[i].opacity, c = 0;
                c < this._stops.length;
                ++c
              )
                l.isEqualEps(this._stops[c].position, h) &&
                  (this._stops[c].opacity = A);
        }

/** @override */
GGradient.prototype.toString = function () {
          return "[Object GGradient]";
        }

module.exports = GGradient;
