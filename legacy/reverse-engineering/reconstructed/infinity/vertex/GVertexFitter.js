/**
 * GVertexFitter
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GVertexFitter() {
  // Constructor (reconstructed)
}

// Prototype methods
GVertexFitter.prototype._computeLeftTangent = function (e, t) {
          var i;
          return (i = (i = e[t + 1].subtract(e[t])).scale(
            1 / Math.sqrt(i.dot(i))
          ));
        }

GVertexFitter.prototype._computeRightTangent = function (e, t) {
          var i;
          return (i = (i = e[t - 1].subtract(e[t])).scale(
            1 / Math.sqrt(i.dot(i))
          ));
        }

GVertexFitter.prototype._computeCenterTangent = function (e, t) {
          var i;
          if (r.equals(e[t - 1], e[t + 1])) {
            var n = e[t].subtract(e[t - 1]);
            i = new r(-n.getY(), n.getX());
          } else i = e[t - 1].subtract(e[t + 1]);
          return (i = i.scale(1 / Math.sqrt(i.dot(i))));
        }

GVertexFitter.prototype._chordLengthParameterize = function (e, t, i) {
          var n, r;
          for ((r = new Array(i - t + 1))[0] = 0, n = t + 1; n <= i; n++) {
            var o = e[n].subtract(e[n - 1]);
            r[n - t] = r[n - t - 1] + Math.sqrt(o.dot(o));
          }
          var a = r[i - t];
          if (!a) return null;
          for (n = t + 1; n <= i; n++) r[n - t] = r[n - t] / a;
          return 1 != r[i - t] && (console.log("non1"), (r[i - t] = 1)), r;
        }

GVertexFitter.prototype._computeHook = function (e, t, i, n) {
          var r = this._evalBezier(3, n, i),
            o = e.add(t).scale(0.5).subtract(r),
            a = Math.sqrt(o.dot(o));
          return a < this.tolerance
            ? 0
            : ((o = e.subtract(t)), a / (Math.sqrt(o.dot(o)) + this.tolerance));
        }

GVertexFitter.prototype._computeMaxError = function (e, t, i, n, r, o) {
          var a,
            s,
            l,
            h,
            A,
            c,
            p,
            u = 0;
          (o[0] = (i - t + 1) / 2), (s = 0);
          var d = n[0];
          for (a = t + 1; a < i; a++)
            (l = (A = (h = this._evalBezier(3, n, r[a - t])).subtract(
              e[a]
            )).dot(A)) >= s && ((s = l), (o[0] = a)),
              u <
                (p = this._computeHook(
                  d,
                  h,
                  0.5 * (r[a - t - 1] + r[a - t]),
                  n
                )) && ((u = p), (c = a)),
              (d = h);
          var g,
            f = Math.sqrt(s) / this.tolerance;
          return u <= f ? (g = f) : ((g = -u), (o[0] = c - 1)), g;
        }

GVertexFitter.prototype.toString = function () {
          return "[Object GVertexFitter]";
        }

module.exports = GVertexFitter;
