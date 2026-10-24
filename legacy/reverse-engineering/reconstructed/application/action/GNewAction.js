/**
     * Action creating a new document
     * @class GNewAction
     * @extends GAction
     * @constructor
     */

function GNewAction() {}

GObject.inherit(GNewAction, GAction);

// Prototype methods
/**
     * Action creating a new document
     * @class GNewAction
     * @extends GAction
     * @constructor
     */
    function GNewAction() {
    };
    IFObject.inherit(GNewAction, GAction);

    GNewAction.ID = 'file.new';
    GNewAction.TITLE = new IFLocale.Key(GNewAction, "title");

    /**
     * @override
     */
GNewAction.prototype.getId = function () {
        return s.ID;
      }

GNewAction.prototype.isEnabled = function () {
        return gDesigner.getApplicationManager().isCreatingNewDocumentEnabled();
      }

/**
     * Action creating a new document
     * @class GNewAction
     * @extends GAction
     * @constructor
     */
    function GNewAction() {
    };
    IFObject.inherit(GNewAction, GAction);

    GNewAction.ID = 'file.new';
    GNewAction.TITLE = new IFLocale.Key(GNewAction, "title");

    /**
     * @override
     */

    /**
     * @override
     */
GNewAction.prototype.getTitle = function () {
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
GNewAction.prototype.getCategory = function () {
        return a.CATEGORY_FILE;
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
GNewAction.prototype.getGroup = function () {
        return "document";
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
GNewAction.prototype.getShortcut = function () {
        return [i.GKey.Constant.OPTION, "N"];
      }

GNewAction.prototype.getAdditionalShortcuts = function () {
        return [[i.GKey.Constant.META, "N"]];
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
GNewAction.prototype.execute = function () {
        gContainer.newDocumentActionPerformed(),
          gDesigner.openNewDocumentDialog({
            closable: !0,
            showCloudOptions: !0,
            defaultOption: "start-option",
            newOrFromTemplate: !0,
          });
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
GNewAction.prototype.toString = function () {
        return "[Object GNewAction]";
      }


module.exports = GNewAction;
