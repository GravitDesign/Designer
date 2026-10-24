/**
     * Action for fitting the current layer into the current view
     * @class GFitCurrentLayerAction
     * @extends GAction
     * @constructor
     */

function GFitCurrentLayerAction() {}

GObject.inherit(GFitCurrentLayerAction, GAction);

// Prototype methods
/**
     * Action for fitting the current layer into the current view
     * @class GFitCurrentLayerAction
     * @extends GAction
     * @constructor
     */
    function GFitCurrentLayerAction() {
    };
    IFObject.inherit(GFitCurrentLayerAction, GAction);

    GFitCurrentLayerAction.ID = 'view.zoom.fit-current-layer';
    GFitCurrentLayerAction.TITLE = new IFLocale.Key(GFitCurrentLayerAction, "title");

    /**
     * @override
     */
GFitCurrentLayerAction.prototype.getId = function () {
        return r.ID;
      }

/**
     * @override
     */

    /**
     * @override
     */
GFitCurrentLayerAction.prototype.getTitle = function () {
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
GFitCurrentLayerAction.prototype.getCategory = function () {
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
GFitCurrentLayerAction.prototype.getGroup = function () {
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

    /**
     * @override
     */
GFitCurrentLayerAction.prototype.isEnabled = function () {
        var e = gDesigner.getActiveDocument(),
          t = e ? e.getScene().getActiveLayer() : null;
        return t && t.getPaintBBox() && !t.getPaintBBox().isEmpty();
      }

/**
     * @override
     */

    /**
     * @override
     */
GFitCurrentLayerAction.prototype.execute = function () {
        var e = gDesigner.getActiveDocument(),
          t = e.getScene().getActiveLayer();
        e.getActiveWindow().getView().zoomAll(t.getPaintBBox(), !1, !0);
      }

/**
     * @override
     */

    /** @override */
GFitCurrentLayerAction.prototype.toString = function () {
        return "[Object GFitCurrentLayerAction]";
      }


module.exports = GFitCurrentLayerAction;
