/**
     * Action for snapping to units
     * @class GSnapUnitAction
     * @extends GAction
     * @constructor
     */

function GSnapUnitAction(e) {
      (this._category = e);
(this._title = new a.GLocaleKey("GSnapUnitAction", "title." + e));
    }

GObject.inherit(GSnapUnitAction, GAction);

// Prototype methods
/** @enum */
    GSnapUnitAction.Type = {
        FullUnit: 'full',
        HalfUnit: 'half'
    };

    GSnapUnitAction.ID = 'arrange.snap-unit';

    /** @type {GSnapUnitAction.Type} */
    GSnapUnitAction.prototype._type = null;

    /** @type {IFLocale.Key} */
    GSnapUnitAction.prototype._title = null;

    /**
     * @override
     */
GSnapUnitAction.prototype.getId = function () {
        return l.ID + "." + this._category;
      }

/** @type {GSnapUnitAction.Type} */
    GSnapUnitAction.prototype._type = null;

    /** @type {IFLocale.Key} */
    GSnapUnitAction.prototype._title = null;

    /**
     * @override
     */

    /**
     * @override
     */
GSnapUnitAction.prototype.getTitle = function () {
        return this._title;
      }

/** @type {GSnapUnitAction.Type} */
    GSnapUnitAction.prototype._type = null;

    /** @type {IFLocale.Key} */
    GSnapUnitAction.prototype._title = null;

    /**
     * @override
     */

    /**
     * @override
     */

    /**
     * @override
     */
GSnapUnitAction.prototype.getCategory = function () {
        return r.CATEGORY_MODIFY_ALIGN;
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
GSnapUnitAction.prototype.getGroup = function () {
        return "arrange/snap-unit";
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
GSnapUnitAction.prototype.getShortcut = function () {
        switch (this._category) {
          case l.Type.FullUnit:
            return [i.GKey.Constant.SHIFT, i.GKey.Constant.META, "U"];
          default:
            return null;
        }
      }

/**
     * @override
     */

    /**
     * @override
     */

    /**
     * @param {Array<IFElement>} [elements] optional elements, if not given
     * uses the selection
     * @override
     */
GSnapUnitAction.prototype.isEnabled = function (elements) {
        return (
          (e =
            e ||
            (gDesigner.getActiveDocument()
              ? gDesigner
                  .getActiveDocument()
                  .getEditor()
                  .getIndividualSelection()
              : null)) && e.length > 0
        );
      }

/**
     * @param {Array<IFElement>} [elements] optional elements, if not given
     * uses the selection
     * @override
     */
GSnapUnitAction.prototype.execute = function (elements) {
        var t = gDesigner.getActiveDocument(),
          n = t.getScene();
        e || (e = t.getEditor().getIndividualSelection()),
          o.GEditor.tryRunTransaction(
            n,
            function () {
              for (var t = 0; t < e.length; ++t) {
                var n = e[t];
                if (n.hasMixin(a.GElement.Transform)) {
                  var o = n.getGeometryBBox();
                  if (o && o.getWidth() + o.getHeight() !== 0) {
                    var i = a.GMath.round(o.getX(), !0),
                      r = a.GMath.round(o.getY(), !0),
                      s = a.GMath.round(o.getWidth(), !0),
                      c = a.GMath.round(o.getHeight(), !0);
                    this._category === l.Type.HalfUnit &&
                      ((i += 0.5), (r += 0.5), (s += 0.5), (c += 0.5));
                    var d = new a.GTransform()
                      .translated(-o.getX(), -o.getY())
                      .scaled(s / (o.getWidth() || 1), c / (o.getHeight() || 1))
                      .translated(o.getX(), o.getY())
                      .translated(i - o.getX(), r - o.getY());
                    n.transform(d);
                  }
                }
              }
            }.bind(this),
            a.GLocale.get(this.getTitle())
          );
      }

/** @override */
GSnapUnitAction.prototype.toString = function () {
        return "[Object GSnapUnitAction]";
      }


module.exports = GSnapUnitAction;
