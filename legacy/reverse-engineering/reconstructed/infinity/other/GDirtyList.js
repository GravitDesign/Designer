/**
     * A general-purpose data structure for holding a list of rectangular
     * regions that need to be repainted, with intelligent coalescing.
     *
     * IFDirtyList will unify two regions A and B if the smallest rectangle
     * enclosing both A and B occupies no more than epsilon + Area_A +
     * Area_B. Failing this, if two corners of A fall within B, A will be
     * shrunk to exclude the union of A and B.
     *
     * @class GDirtyList
     * @constructor
     * @version 1.0
     */

function GDirtyList() {
  // Constructor (reconstructed)
}

// Prototype methods
GDirtyList.prototype.translate = function (e, t) {
          if (this._dirties && this._numDirties > 0)
            for (var i = 0; i < this._numDirties; ++i)
              (this._dirties[i][0] += e), (this._dirties[i][1] += t);
        }

/**
     * Flushes this dirty list which means that a matcher with dirty
     * regions gets returned and the dirty list gets cleaned.
     * @return {IFDirtyList.Matcher} null if there's nothing dirty or a valid matcher
     * @version 1.0
     */
GDirtyList.prototype.flush = function () {
          var e = null;
          if (this._numDirties > 0) {
            (e = new r.Matcher())._rects = new Array(this._numDirties);
            for (var t = 0, i = 0; i < this._numDirties; ++i) {
              var o = this._dirties[i];
              if (o && o[2] > 0 && o[3] > 0) {
                var a = new n(o[0], o[1], o[2], o[3]);
                (e._rects[t++] = a),
                  null == e._unitedArea
                    ? (e._unitedArea = a)
                    : (e._unitedArea = e._unitedArea.united(a));
              }
            }
            (e._rects.length = t), 0 == e._rects.length && (e = null);
          }
          return this.reset(), e;
        }

/**
     * Simply reset this dirty list
     * @version 1.0
     */
GDirtyList.prototype.reset = function () {
          this._numDirties > 0 &&
            ((this._dirties.length = r.options.bufferSize),
            (this._numDirties = 0));
        }

/**
     * Simply reset this dirty list
     * @version 1.0
     */
    IFDirtyList.prototype.reset = function () {
        if (this._numDirties > 0) {
            // Clear ourself
            this._dirties.length = IFDirtyList.options.bufferSize;
            this._numDirties = 0;
        }
    };

    /** @override */
GDirtyList.prototype.toString = function () {
          return "[Object GDirtyList]";
        }

module.exports = GDirtyList;
