/**
     * Action for reseting the current view to the original view
     * @class GOriginalViewAction
     * @extends GAction
     * @constructor
     */

function GOriginalViewAction() {}

GObject.inherit(GOriginalViewAction, GAction);

// Prototype methods
/**
     * Action for reseting the current view to the original view
     * @class GOriginalViewAction
     * @extends GAction
     * @constructor
     */
    function GOriginalViewAction() {
    };
    IFObject.inherit(GOriginalViewAction, GAction);

    GOriginalViewAction.ID = 'view.zoom.original';
    GOriginalViewAction.TITLE = new IFLocale.Key(GOriginalViewAction, "title");

    /**
     * @override
     */
GOriginalViewAction.prototype.getId = function () {
        return s.ID;
      }

/**
     * @override
     */

    /**
     * @override
     */
GOriginalViewAction.prototype.getTitle = function () {
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
GOriginalViewAction.prototype.getCategory = function () {
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
GOriginalViewAction.prototype.getGroup = function () {
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
GOriginalViewAction.prototype.getShortcut = function () {
        return [i.GKey.Constant.META, "0"];
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
GOriginalViewAction.prototype.isEnabled = function () {
        return !!gDesigner.getActiveDocument();
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
GOriginalViewAction.prototype.execute = function () {
        var e,
          t = gDesigner.getActiveDocument(),
          n = t
            .getActiveWindow()
            .getView()
            .getViewConfiguration().multiPageView,
          i = t.getScene();
        if (i.isFixedSized()) {
          var a = i.getActivePage();
          if (
            ((e = new o.GRect(0, 0, a.getProperty("w"), a.getProperty("h"))), n)
          ) {
            var r = a.getPosition(!0);
            r && (e = e.translated(r.getX(), r.getY()));
          }
        } else e = i.getPaintBBox(n);
        e &&
          !e.isEmpty() &&
          t
            .getActiveWindow()
            .getView()
            .zoomAtCenter(e.getSide(o.GRect.Side.CENTER), 1);
      }

/**
     * @override
     */

    /** @override */
GOriginalViewAction.prototype.toString = function () {
        return "[Object GOriginalViewAction]";
      }


module.exports = GOriginalViewAction;
