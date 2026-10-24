/**
     * The guide manager
     * @param {IFScene} scene
     * @class GGuides
     * @extend GEventTarget
     * @constructor
     */

function GGuides() {
  // Constructor (reconstructed)
}

// Prototype methods
GGuides.prototype.addGuide = function (e, t) {
          this._guides.push(e),
            t
              ? (this._bboxGuide = e)
              : e.isFullPixelsGuide() && (this._fullPixelsGuide = e);
        }

GGuides.prototype._isGuideEnabled = function (e, t) {
          var i = g.options.guides;
          return (
            !!(i && i.indexOf(e.getId()) >= 0) &&
            (!t || !t.length || t.indexOf(e.getId()) >= 0)
          );
        }

GGuides.prototype._getBBoxGuide = function () {
          return this._bboxGuide || null;
        }

GGuides.prototype.canMapGuide = function (e, t, i, n) {
          return (
            this._isGuideEnabled(e, t) &&
            e.isMappingAllowed(i) &&
            (!n || e.canMapWithFullPixelsGuide())
          );
        }

/**
     * Add a guide to this manager
     * @param {IFGuide} guide
     */
    IFGuides.prototype._addGuide = function (guide) {
        this._guides.push(guide);
    };

    /** @override */
GGuides.prototype.toString = function () {
          return "[Object GGuides]";
        }

module.exports = GGuides;
