/**
     * A paint configuration for model painting
     * @class GScenePaintConfiguration
     * @constructor
     * @extends IFPaintConfiguration
     */

function GScenePaintConfiguration() {}

GObject.inherit(GScenePaintConfiguration, GObject);

// Prototype methods
/**
     * A clip area defining the area of paint for the scene
     * @type {IFRect}
     */
    IFScenePaintConfiguration.prototype.clipArea = null;

    /**
     * Checks and returns whether to paint outlined or not
     * @param {IFPaintContext} [context] optional context
     * to include when checking
     * @returns {boolean}
     */
GScenePaintConfiguration.prototype.isOutline = function (context) {
          return (
            this.paintMode === a.PaintMode.Outline || !(!e || !e.isOutline())
          );
        }

/**
     * Checks and returns whether to paint annotations or not
     * @param {IFPaintContext} [context] optional context
     * to include when checking
     * @returns {boolean}
     */
GScenePaintConfiguration.prototype.isAnnotationsVisible = function (context) {
          return !!this.annotations;
        }

/**
     * Checks and returns whether to paint guides or not
     * @param {IFPaintContext} [context] optional context
     * to include when checking
     * @returns {boolean}
     */
GScenePaintConfiguration.prototype.isGuidesVisible = function (context) {
          return !(!this.guides || !this.isAnnotationsVisible());
        }

/**
     * Checks and returns whether to paint slices or not
     * @param {IFPaintContext} [context] optional context
     * to include when checking
     * @returns {boolean}
     */
GScenePaintConfiguration.prototype.isSlicesVisible = function (context) {
          return !(!this.slices || !this.isAnnotationsVisible());
        }

GScenePaintConfiguration.prototype.isElementAnnotationsVisible = function (e) {
          if (!this.elementAnnotations || !this.isAnnotationsVisible())
            return false;
          if (e) {
            if (e.getProperty("rmd")) return false;
            if (!this.showResolvedAnnotations && e.getProperty("rsv"))
              return false;
          }
          return true;
        }

GScenePaintConfiguration.prototype.isClipToPage = function (e) {
          return this.clipToPage || this.paintMode === a.PaintMode.Output;
        }

/**
     * Tests and returns wether pages should be clipped or not
     * @param context
     */
    IFScenePaintConfiguration.prototype.isPagesClip = function (context) {
        return (this.pagesClip || this.paintMode === IFScenePaintConfiguration.PaintMode.Output);
    };

    /** @override */
GScenePaintConfiguration.prototype.toString = function () {
          return "[Object GScenePaintConfiguration]";
        }


module.exports = GScenePaintConfiguration;
