/**
 * GShowRulersAction
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GShowRulersAction() {}

GObject.inherit(GShowRulersAction, GAction);

// Prototype methods
/**
     * Action for showing / hiding the rulers
     * @class GShowRulersAction
     * @extends GAction
     * @constructor
     */
    function GShowRulersAction() {
    };
    IFObject.inherit(GShowRulersAction, GAction);

    GShowRulersAction.ID = 'view.show-rulers';
    GShowRulersAction.TITLE = new IFLocale.Key(GShowRulersAction, "title");

    /**
     * @override
     */
GShowRulersAction.prototype.getId = function () {
        return l.ID;
      }

/**
     * @override
     */

    /**
     * @override
     */
GShowRulersAction.prototype.getTitle = function () {
        return l.TITLE;
      }

/**
     * @override
     */

    /**
     * @override
     */

    /**
     * @override
     */
GShowRulersAction.prototype.getCategory = function () {
        return i.CATEGORY_EDIT;
      }

/**
     * @override
     */

    /**
     * @override
     */

    /**
     * @override
     */

    /**
     * @override
     */
GShowRulersAction.prototype.getGroup = function () {
        return "settings";
      }

GShowRulersAction.prototype.getIcon = function () {
        return gDesigner.isTouchEnabled() ? "gravit-icon-setting-touch" : "";
      }

/** @override */
    GShowRulersAction.prototype.isCheckable = function () {
        return true;
    };

    /**
     * @override
     */
    GShowRulersAction.prototype.isChecked = function () {
        // TODO
        return false;
    };

    /**
     * @override
     */
    GShowRulersAction.prototype.execute = function () {
        // TODO
        return false;
    };

    /** @override */
GShowRulersAction.prototype.toString = function () {
        return "[Object GSettingsAction]";
      }

/**
     * Action for showing / hiding the rulers
     * @class GShowRulersAction
     * @extends GAction
     * @constructor
     */
    function GShowRulersAction() {
    };
    IFObject.inherit(GShowRulersAction, GAction);

    GShowRulersAction.ID = 'view.show-rulers';
    GShowRulersAction.TITLE = new IFLocale.Key(GShowRulersAction, "title");

    /**
     * @override
     */

/**
     * @override
     */

    /**
     * @override
     */

/**
     * @override
     */

    /**
     * @override
     */

    /**
     * @override
     */

/**
     * @override
     */

    /**
     * @override
     */

    /**
     * @override
     */

    /**
     * @override
     */

/**
     * @override
     */

    /**
     * @override
     */

    /**
     * @override
     */

    /**
     * @override
     */
GShowRulersAction.prototype.getShortcut = function () {
        return [i.GKey.Constant.META, i.GKey.Constant.OPTION, "R"];
      }

/**
     * @override
     */

    /**
     * @override
     */

    /**
     * @override
     */

    /**
     * @override
     */
GShowRulersAction.prototype.isEnabled = function () {
        return !(
          !gDesigner.getWindows().getActiveWindow() ||
          !gDesigner.getWindows().getActiveWindow().getView()
        );
      }

/**
     * @override
     */

    /**
     * @override
     */

    /**
     * @override
     */

    /** @override */

/**
     * @override
     */

    /**
     * @override
     */

    /** @override */

    /**
     * @override
     */

/**
     * @override
     */

    /** @override */

    /**
     * @override
     */

    /**
     * @override
     */

/** @override */

    /**
     * @override
     */

    /**
     * @override
     */

    /** @override */


module.exports = GShowRulersAction;
