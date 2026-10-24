/**
     * Action for cloning the current view
     * @class GNewWindowAction
     * @extends GAction
     * @constructor
     */

function GNewWindowAction() {}

GObject.inherit(GNewWindowAction, GAction);

// Prototype methods
/**
     * Action for cloning the current view
     * @class GNewWindowAction
     * @extends GAction
     * @constructor
     */
    function GNewWindowAction() {
    };
    IFObject.inherit(GNewWindowAction, GAction);

    GNewWindowAction.ID = 'view.clone';
    GNewWindowAction.TITLE = new IFLocale.Key(GNewWindowAction, "title");

    /**
     * @override
     */
GNewWindowAction.prototype.getId = function () {
        return s.ID;
      }

/**
     * @override
     */

    /**
     * @override
     */
GNewWindowAction.prototype.getTitle = function () {
        return s.TITLE;
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
GNewWindowAction.prototype.getCategory = function () {
        return a.CATEGORY_VIEW;
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
GNewWindowAction.prototype.getGroup = function () {
        return "view";
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
GNewWindowAction.prototype.getShortcut = function () {
        return [i.GKey.Constant.META, i.GKey.Constant.OPTION, "N"];
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
GNewWindowAction.prototype.isEnabled = function () {
        return !!gDesigner.getWindows().getActiveWindow();
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
GNewWindowAction.prototype.execute = function () {
        gDesigner
          .getWindows()
          .addWindow(gDesigner.getWindows().getActiveWindow());
      }

/**
     * @override
     */

    /**
     * @override
     */

    /** @override */
GNewWindowAction.prototype.toString = function () {
        return "[Object GNewWindowAction]";
      }


module.exports = GNewWindowAction;
