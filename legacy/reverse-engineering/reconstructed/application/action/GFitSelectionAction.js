/**
     * Action for fitting the selection into the current view
     * @class GFitSelectionAction
     * @extends GAction
     * @constructor
     */

function GFitSelectionAction() {}

GObject.inherit(GFitSelectionAction, GAction);

// Prototype methods
/**
     * Action for fitting the selection into the current view
     * @class GFitSelectionAction
     * @extends GAction
     * @constructor
     */
    function GFitSelectionAction() {
    };
    IFObject.inherit(GFitSelectionAction, GAction);

    GFitSelectionAction.ID = 'view.zoom.fit-selection';
    GFitSelectionAction.TITLE = new IFLocale.Key(GFitSelectionAction, "title");

    /**
     * @override
     */
GFitSelectionAction.prototype.getId = function () {
        return r.ID;
      }

/**
     * @override
     */

    /**
     * @override
     */
GFitSelectionAction.prototype.getTitle = function () {
        return r.TITLE;
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
GFitSelectionAction.prototype.getCategory = function () {
        return i.CATEGORY_VIEW;
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
GFitSelectionAction.prototype.getGroup = function () {
        return "zoom";
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
    GFitSelectionAction.prototype.getShortcut = function () {
        return [IFKey.Constant.META, IFKey.Constant.OPTION, 'O'];
    };

    /**
     * @override
     */
GFitSelectionAction.prototype.isEnabled = function () {
        var e = gDesigner.getActiveDocument(),
          t = e ? e.getEditor() : null;
        return t && t.hasSelection();
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
GFitSelectionAction.prototype.execute = function () {
        var e = gDesigner.getActiveDocument(),
          t = (e ? e.getEditor() : null).getSelectionBBox();
        t && !t.isEmpty() && e.getActiveWindow().getView().zoomAll(t, !1, !0);
      }

/** @override */
GFitSelectionAction.prototype.toString = function () {
        return "[Object GFitSelectionAction]";
      }


module.exports = GFitSelectionAction;
