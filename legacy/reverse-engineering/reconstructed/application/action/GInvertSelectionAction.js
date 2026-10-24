/**
     * Action for inverting the current selection
     * @class GInvertSelectionAction
     * @extends GAction
     * @constructor
     */

function GInvertSelectionAction() {}

GObject.inherit(GInvertSelectionAction, GAction);

// Prototype methods
/**
     * Action for inverting the current selection
     * @class GInvertSelectionAction
     * @extends GAction
     * @constructor
     */
    function GInvertSelectionAction() {
    };
    IFObject.inherit(GInvertSelectionAction, GAction);

    GInvertSelectionAction.ID = 'edit.invert-selection';
    GInvertSelectionAction.TITLE = new IFLocale.Key(GInvertSelectionAction, "title");

    /**
     * @override
     */
GInvertSelectionAction.prototype.getId = function () {
        return s.ID;
      }

/**
     * @override
     */

    /**
     * @override
     */
GInvertSelectionAction.prototype.getTitle = function () {
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
GInvertSelectionAction.prototype.getCategory = function () {
        return a.CATEGORY_EDIT;
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
GInvertSelectionAction.prototype.getGroup = function () {
        return "select";
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
GInvertSelectionAction.prototype.getShortcut = function () {
        return [i.GKey.Constant.SHIFT, i.GKey.Constant.META, "I"];
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
GInvertSelectionAction.prototype.isEnabled = function () {
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
GInvertSelectionAction.prototype.execute = function () {
        var e = gDesigner.getActiveDocument(),
          t = e.getScene(),
          n = t.getActivePage(),
          i = gDesigner
            .getActiveDocument()
            .getActiveWindow()
            .getView()
            .getViewConfiguration().multiPageView,
          a = [];
        t.accept(function (e) {
          if (
            e instanceof o.GItem &&
            !e.hasMixin(o.GAnnotation) &&
            !(e.getParent() instanceof o.GItem) &&
            !e.hasFlag(o.GNode.Flag.Selected) &&
            (e.getPage() === n || i) &&
            !e.isLocked()
          ) {
            var t =
                !e.getProperty("vis") ||
                e.findParent(function (e) {
                  return e instanceof o.GBlock && !e.getProperty("vis");
                }),
              r = e.getProperty("plkt"),
              s =
                r & o.GBlock.ProgramLck.NoEdit &&
                r & o.GBlock.ProgramLck.NoSizeChanges &&
                r & o.GBlock.ProgramLck.NoMove &&
                r & o.GBlock.ProgramLck.NoDelete;
            t || s || a.push(e);
          }
        }),
          e.getEditor().updateSelection(!1, a);
      }

/** @override */
GInvertSelectionAction.prototype.toString = function () {
        return "[Object GInvertSelectionAction]";
      }


module.exports = GInvertSelectionAction;
