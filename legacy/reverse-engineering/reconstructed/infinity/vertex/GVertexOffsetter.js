/**
     * @class GVertexOffsetter
     * @extends IFVertexSource
     * @param {IFVertexSource} source the underyling vertex source to work on
     * @param {Number} offset - the distance at which offset should be calculated
     * @param {Boolean} inset - indicates if an inset is required
     * @param {Boolean} outset - indicates if an outset is required
     * @param {Number} tol - offset approximation tolerance value (preciseness)
     * @constructor
     */

function GVertexOffsetter() {
  // Constructor (reconstructed)
}

// Prototype methods
GVertexOffsetter.prototype._getCubicBezierArcError = function (alpha, radius) {
          var i = 5.15347174 * t,
            n = Math.cos(e),
            r = n * n,
            o = 2 * r - 1,
            a = (4 * r - 3) * n,
            s = 22979e-8 * n - 19.65763511 + 42715e-8 * o + 0.00103256 * a,
            l = 9.92683097 + 45907e-8 * n + 0.00174813 * o - 34153e-8 * a;
          return i * Math.exp(s + l * e);
        }

GVertexOffsetter.prototype._rewindVertices = function () {
          for (var e = 0; e < this._pieces.length; ++e)
            this._pieces[e].rewindVertices(0);
        }

GVertexOffsetter.prototype._readVertex = function (vertex) {
          return (
            !(
              !this._pieces[this._pieceIdx] ||
              !this._pieces[this._pieceIdx].readVertex(e)
            ) ||
            (++this._pieceIdx,
            this._pieces[this._pieceIdx] &&
              this._pieces[this._pieceIdx].readVertex(e))
          );
        }

/** @override */
GVertexOffsetter.prototype.toString = function () {
          return "[Object GVertexOffsetter]";
        }

module.exports = GVertexOffsetter;
