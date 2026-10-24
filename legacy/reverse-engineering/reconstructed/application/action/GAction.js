/**
     * Base class for an action
     * @class GAction
     * @extends IFObject
     * @constructor
     */

function GAction() {}

// Prototype methods
/**
     * Base class for an action
     * @class GAction
     * @extends IFObject
     * @constructor
     */
    function GAction() {
    };
    IFObject.inherit(GAction, IFObject);

    /**
     * Get the id of the action
     * @return {String}
     * @version 1.0
     */
GAction.prototype.getId = function () {
        throw new Error("Not Supported");
      }

/**
     * Get the id of the action
     * @return {String}
     * @version 1.0
     */

    /**
     * Get the title of the action
     * @return {IFLocale.Key|String}
     * @version 1.0
     */
GAction.prototype.getTitle = function () {
        throw new Error("Not Supported");
      }

GAction.prototype.getFullTitle = function () {
        return this.getTitle();
      }

GAction.prototype.getInfo = function () {
        return null;
      }

GAction.prototype.getIcon = function () {
        return r.default[this.getId()] || null;
      }

/**
     * Get the title of the action
     * @return {IFLocale.Key|String}
     * @version 1.0
     */

    /**
     * Get the category of the action,
     * returns null by default
     * @return {IFLocale.Key|String}
     * @version 1.0
     */
GAction.prototype.getCategory = function () {
        return null;
      }

/**
     * Get the category of the action,
     * returns null by default
     * @return {IFLocale.Key|String}
     * @version 1.0
     */

    /**
     * Get the group of the action
     * @return {String}
     * @version 1.0
     */
GAction.prototype.getGroup = function () {
        return null;
      }

GAction.prototype.getGroupIcon = function () {
        return null;
      }

/**
     * Get the group of the action
     * @return {String}
     * @version 1.0
     */

    /**
     * Get the default shortcut of the action
     * @return {Array<Number>}
     * @version 1.0
     */
GAction.prototype.getShortcut = function () {
        return null;
      }

GAction.prototype.getShortcutHint = function (e) {
        return s.getActionShortcutHint(this.getShortcut(), e);
      }

GAction.prototype.isShortcutGlobal = function () {
        return false;
      }

GAction.prototype.isRegisterShortcut = function () {
        return null;
      }

GAction.prototype.getAdditionalShortcuts = function () {
        return null;
      }

/**
     * Get the default shortcut of the action
     * @return {Array<Number>}
     * @version 1.0
     */

    /**
     * Get the enabled status of the action
     * @return {Boolean} true if enabled, false if not
     * @version 1.0
     */
GAction.prototype.isEnabled = function () {
        return true;
      }

GAction.prototype.isKeyBoardEventRequiredToExecute = function () {
        return false;
      }

/**
     * Get the enabled status of the action
     * @return {Boolean} true if enabled, false if not
     * @version 1.0
     */

    /**
     * Whether this action is checkable or not
     * @return {Boolean} true if checkable, false if not
     */
GAction.prototype.isCheckable = function () {
        return false;
      }

/**
     * Whether this action is checkable or not
     * @return {Boolean} true if checkable, false if not
     */

    /**
     * Get the checked status of the action
     * @return {Boolean} true if checked, false if not
     * @version 1.0
     */
GAction.prototype.isChecked = function () {
        return false;
      }

/**
     * Get the checked status of the action
     * @return {Boolean} true if checked, false if not
     * @version 1.0
     */

    /**
     * Called to check if the action is available or not
     * @return {Boolean} true if available, false if not
     */
GAction.prototype.isAvailable = function (e) {
        return true;
      }

/**
     * Called to check if the action is available or not
     * @return {Boolean} true if available, false if not
     */

    /**
     * Execute the action
     * @version 1.0
     */
GAction.prototype.execute = function () {
        throw new Error("Not Supported");
      }

GAction.prototype.executeFromShortcut = function (e) {
        return this.execute.apply(this, arguments);
      }

GAction.prototype.isPro = function () {
        return false;
      }

GAction.prototype.getTooltipArea = function () {
        return null;
      }

GAction.prototype.getTooltipConfig = function (e) {
        return null;
      }

GAction.prototype.isVisible = function () {
        return true;
      }

GAction.prototype.noHover = function () {
        return false;
      }

GAction.prototype.getStyleClass = function () {
        return null;
      }

GAction.prototype.statsValue = function () {
        return null;
      }

/**
     * Called to check if the action is available or not
     * @return {Boolean} true if available, false if not
     */

    /**
     * Execute the action
     * @version 1.0
     */

    /** @override */
GAction.prototype.toString = function () {
        return "[Object GAction]";
      }


module.exports = GAction;
