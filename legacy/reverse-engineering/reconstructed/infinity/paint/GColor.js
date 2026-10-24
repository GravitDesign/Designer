/**
     * A class representing a color
     * @param {IFColor.Type} type
     * @param {Array<Number>|String> [value]
     * @class GColor
     * @extends IFPattern
     * @constructor
     */

function GColor() {
  // Constructor (reconstructed)
}

// Prototype methods
/**
     * @type {Array<Number>|String|null}
     * @private
     */
    IFColor.prototype._value = null;

    /** @override */
    IFColor.prototype.getPatternType = function () {
        return IFPattern.Type.Color;
    };

    /**
     * @returns {IFColor.Type}
     */
    IFColor.prototype.getType = function () {
        return this._type;
    };

    /**
     * DO NOT MODIFY RETURN VALUE!!!
     * @returns {Array<Number>|String|null}
     */
GColor.prototype.getValue = function () {
          return this._value;
        }

GColor.prototype.serialize = function () {
          return this._value ? JSON.stringify(this._value) : "";
        }

GColor.prototype.deserialize = function (e) {
          e && (this._value = JSON.parse(e));
        }

GColor.prototype.toHumanString = function () {
          throw new Error("Not Supported.");
        }

GColor.prototype.toScreen = function (e) {
          throw new Error("Not Supported.");
        }

GColor.prototype.toScreenCSS = function (e, t) {
          return s.rgbToCSS(this.toScreen(t), e);
        }

GColor.prototype.getAverageColor = function () {
          return this.toScreen().concat([1]);
        }

GColor.prototype.asCSSBackground = function (e) {
          var t = this.toScreenCSS(e);
          return "linear-gradient(" + t + ", " + t + ")";
        }

/**
     * Return new instanceof of this color with a given tone
     * @param {Number} tone the tone from 0..100
     * @returns {IFColor}
     */
    IFColor.prototype.withTone = function (tone) {
        return this.withTint(tone).withShade(tone);
    };

    /** @override */
GColor.prototype.toString = function () {
          return "[Object GColor]";
        }


module.exports = GColor;
