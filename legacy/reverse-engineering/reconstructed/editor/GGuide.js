/**
     * Base for a guide
     * @param {IFGuides} guides the owner guides
     * @class GGuide
     * @constructor
     */

function GGuide(e) {
        (this._guides = e);
(this._scene = e._scene);
(this._allowedZones = [
            a.Side.TOP_LEFT,
            a.Side.CENTER,
            a.Side.BOTTOM_RIGHT,
          ]);
      }

GObject.inherit(GGuide, GObject);

// Prototype methods
GGuide.prototype.getId = function () {
          throw new Error("Not Implemented.");
        }

GGuide.prototype.isVisual = function () {
          return this.hasMixin(s.Visual);
        }

GGuide.prototype.isRelativeToPage = function () {
          return false;
        }

GGuide.prototype.useExclusions = function (e) {
          this._exclusions = e;
        }

GGuide.prototype.cleanExclusions = function () {
          this._exclusions = null;
        }

GGuide.prototype.isScopeSupported = function () {
          return false;
        }

GGuide.prototype.setScope = function (e) {}

GGuide.prototype.getAllowedSnapZones = function () {
          return this._allowedZones;
        }

GGuide.prototype.allowSnapZone = function (e) {
          -1 === this._allowedZones.indexOf(e) && this._allowedZones.push(e);
        }

GGuide.prototype.disallowSnapZone = function (e) {
          var t = this._allowedZones.indexOf(e);
          t >= 0 && this._allowedZones.splice(t, 1);
        }

GGuide.prototype.snapZoneIsAllowed = function (e) {
          return this._allowedZones.indexOf(e) > -1;
        }

GGuide.prototype.isFullPixelsGuide = function () {
          return false;
        }

GGuide.prototype.canMapWithFullPixelsGuide = function () {
          return true;
        }

/** @override */
    IFGuide.Map.prototype.toString = function () {
        return "[Mixin IFGuide.Map]";
    };

    // -----------------------------------------------------------------------------------------------------------------
    // IFGuide
    // -----------------------------------------------------------------------------------------------------------------

    /** @override */


module.exports = GGuide;
