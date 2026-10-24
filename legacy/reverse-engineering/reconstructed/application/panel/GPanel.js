/**
     * Base class for an panel
     * @class GPanel
     * @extends GView
     * @constructor
     */

function GPanel() {
      i.call(this);
    }

GObject.inherit(GPanel, GObject);

// Prototype methods
/**
     * Get the title of the panel
     * @return {String|IFLocale.Key}
     */
    GPanel.prototype.getTitle = function () {
        return null;
    };

    /**
     * Called to let the panel initialize on a given panel
     * @param {JQuery} htmlElement the panel to put the panel into
     */
GPanel.prototype.init = function (htmlElement) {}

/**
     * Called to let the panel initialize on a given panel
     * @param {JQuery} htmlElement the panel to put the panel into
     */
    GPanel.prototype.init = function (htmlElement) {
        gApp.addEventListener(GApplication.DocumentEvent, this._documentEvent, this);
    };

    /**
     * Called whenever the panel gets activated
     */
GPanel.prototype.activate = function () {}

/**
     * Called whenever the panel gets activated
     */
    GPanel.prototype.activate = function () {
        // NO-OP
    };

    /**
     * Called whenever the panel gets deactivated
     */
GPanel.prototype.deactivate = function () {}

GPanel.prototype.isEnabled = function () {
        return true;
      }

/**
     * Called whenever the panel gets activated
     */
    GPanel.prototype.activate = function () {
        // NO-OP
    };

    /**
     * Called whenever the panel gets deactivated
     */
    GPanel.prototype.deactivate = function () {
        // NO-OP
    };

    /** @override */
GPanel.prototype.toString = function () {
        return "[Object GPanel]";
      }

module.exports = GPanel;
