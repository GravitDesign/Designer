/**
     * Base class for property panels
     * @class GProperties
     * @extends GEventTarget
     * @constructor
     */

function GProperties() {}

// Prototype methods
/**
     * Called to return the category of the panel
     * @return {String|IFLocale.Key}
     */
    GProperties.prototype.getCategory = function () {
        throw new Error("Not Supported.");
    };

    /**
     * Called to initialize the properties panel
     * @param {JQuery} panel the panel to init on
     */
GProperties.prototype.init = function (panel) {
        throw new Error("Not Supported.");
      }

GProperties.prototype.isGroup = function (e) {
        return true;
      }

GProperties.prototype.isSticky = function () {
        return false;
      }

GProperties.prototype.isAvailable = function (e) {
        return !e;
      }

/**
     * Called to initialize the properties panel
     * @param {JQuery} panel the panel to init on
     */
    GProperties.prototype.init = function (panel) {
        throw new Error("Not Supported.");
    };

    /**
     * Called to update
     * @param {GDocument} document the document to work on
     * @param {Array<IFElement>} elements array of elements, contains at least one
     * @return {Boolean} true if this properties panel is available, false if not
     */
GProperties.prototype.update = function (document, elements) {
        (e = e || this._document) && e.clearActiveStylesList();
      }

GProperties.prototype.openPatternChooser = function () {
        throw new Error("Not Supported.");
      }

GProperties.prototype.openEyeDropper = function (e, t) {
        throw new Error("Not Supported.");
      }

GProperties.prototype.setTouchTools = function (e) {
        this._touchTools = e;
      }

GProperties.prototype.getTouchTools = function () {
        return this._touchTools;
      }

/**
     * Called to update
     * @param {GDocument} document the document to work on
     * @param {Array<IFElement>} elements array of elements, contains at least one
     * @return {Boolean} true if this properties panel is available, false if not
     */
    GProperties.prototype.update = function (document, elements) {
        throw new Error("Not Supported.");
    };

    /** @override */
GProperties.prototype.toString = function () {
        return "[Object GProperties]";
      }

module.exports = GProperties;
