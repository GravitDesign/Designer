/**
 * GStarTool
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GStarTool() {
        n.call(this, !1, !1);
      }

// Prototype methods
GStarTool.prototype._getNumberOfPoints = function () {
          return 5;
        }

GStarTool.prototype._getInnerRadiusFactor = function () {
          return 0.5;
        }

GStarTool.prototype._lockAngle = function (e) {
          return (Math.round((10 * e) / Math.PI) * Math.PI) / 10;
        }

GStarTool.prototype.toString = function () {
          return "[Object GStarTool]";
        }

module.exports = GStarTool;
