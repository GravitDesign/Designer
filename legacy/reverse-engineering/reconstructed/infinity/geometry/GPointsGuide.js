/**
 * GPointsGuide
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GPointsGuide() {
  // Constructor (reconstructed)
}

// Prototype methods
GPointsGuide.prototype.useExclusions = function (e) {
          if (e && e.length) {
            var t;
            this._exclusions = [];
            for (var i = 0; i < e.length; ++i)
              (t = e[i]) instanceof a && this._exclusions.push(t);
          }
        }

GPointsGuide.prototype.isRelativeToPage = function () {
          return true;
        }

GPointsGuide.prototype.isScopeSupported = function () {
          return true;
        }

GPointsGuide.prototype.setScope = function (e) {
          if (e && e.length) {
            this._snapElems = [];
            for (var t = 0; t < e.length; ++t) {
              var i = e[t];
              if (i.hasMixin(h.Container))
                for (var n = i.getFirstChild(); null != n; n = n.getNext())
                  n instanceof a && this._snapElems.push(n);
            }
            (this._scoped = true),
              (this._snapMainPage = this._scene.getActivePage());
          } else
            (this._snapElems = null),
              (this._scoped = false),
              (this._snapMainPage = null);
          this._eSnapElems = null;
        }

GPointsGuide.prototype._setEffectiveScope = function (e) {
          if (((this._eSnapElems = []), e.hasMixin(h.Container)))
            for (var t = e.getFirstChild(); null != t; t = t.getNext())
              t instanceof a && this._eSnapElems.push(t);
        }

GPointsGuide.prototype._getEffectiveSnapElems = function () {
          return this._eSnapElems ? this._eSnapElems : this._snapElems;
        }

GPointsGuide.prototype.toString = function () {
          return "[Object GPointsGuide]";
        }

module.exports = GPointsGuide;
