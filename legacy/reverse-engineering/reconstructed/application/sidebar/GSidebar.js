/**
     * Base class for an sidebar
     * @class GSidebar
     * @extends GView
     * @constructor
     */

function GSidebar() {
      i.call(this);
    }

GObject.inherit(GSidebar, GObject);

// Prototype methods
GSidebar.prototype.getOrientation = function () {
        return null;
      }

GSidebar.prototype.getMinimumWidth = function () {
        throw new Error("Not implemented.");
      }

GSidebar.prototype.getDefaultWidth = function () {
        throw new Error("Not implemented.");
      }

GSidebar.prototype.getSettingWidth = function () {
        return gDesigner.getSetting(
          "sidebars_width_".concat(this.getId()),
          this.getDefaultWidth()
        );
      }

GSidebar.prototype.isResizeable = function () {
        return false;
      }

GSidebar.prototype.isDeactivatable = function () {
        return true;
      }

GSidebar.prototype.relayout = function () {}

GSidebar.prototype.resize = function () {}

/**
     * Get the icon code of the sidebar
     * @return {String|JQuery}
     */
    GSidebar.prototype.getIcon = function () {
        return null;
    };

    /**
     * Called to let the sidebar initialize on a given panel
     * @param {JQuery} htmlElement the panel to put the sidebar into
     */
GSidebar.prototype.init = function (htmlElement) {}

/**
     * Called to let the sidebar initialize on a given panel
     * @param {JQuery} htmlElement the panel to put the sidebar into
     */
    GSidebar.prototype.init = function (htmlElement) {
        gApp.addEventListener(GApplication.DocumentEvent, this._documentEvent, this);
    };

    /**
     * Called whenever the sidebar gets activated
     */
GSidebar.prototype.activate = function () {}

GSidebar.prototype.isToolAllowed = function (e) {
        return true;
      }

/**
     * Called whenever the sidebar gets activated
     */
    GSidebar.prototype.activate = function () {
        // NO-OP
    };

    /**
     * Called whenever the sidebar gets deactivated
     */
GSidebar.prototype.deactivate = function () {}

GSidebar.prototype.getTouchTools = function (e) {
        let { disableContextSensitive: t = false } = e;
        return null;
      }

GSidebar.prototype.updateBadge = function (e) {
        return false;
      }

/**
     * Called whenever the sidebar gets activated
     */
    GSidebar.prototype.activate = function () {
        // NO-OP
    };

    /**
     * Called whenever the sidebar gets deactivated
     */
    GSidebar.prototype.deactivate = function () {
        // NO-OP
    };

    /** @override */
GSidebar.prototype.toString = function () {
        return "[Object GSidebar]";
      }

module.exports = GSidebar;
