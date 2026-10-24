/**
     * A class representing a context for painting
     * @class GPaintContext
     * @constructor
     */

function GPaintContext() {
        (this.outlineColors = []), (this.canvasStack = []);
      }

GObject.inheritAndMix(GPaintContext, GObject, [o]);

// Prototype methods
/**
     * Returns the current outline/wireframe color defaulting to black
     * @returns {IFColor}
     */
    IFPaintContext.prototype.getOutlineColor = function () {
        if (this.outlineColors && this.outlineColors.length > 0) {
            return this.outlineColors[this.outlineColors.length - 1];
        } else {
            // TODO : Take this from configuration, instead?
            return IFColor.BLACK;
        }
    };

    /** @override */
GPaintContext.prototype.toString = function () {
          return "[GDictionary]";
        }

/**
     * The current outline color for the highlight
     * @type IFColor
     */
    IFPaintContext.prototype.highlightOutlineColor = IFColor.HIGHLIGHT_OUTLINE;

    /**
     * The current outline color for the guides
     * @type IFColor
     */
    IFPaintContext.prototype.guideOutlineColor = IFColor.GUIDE_OUTLINE;

    /**
     * Returns whether the paint context is in outline/wireframe mode or not
     * @return {boolean}
     */
GPaintContext.prototype.isOutline = function () {
          return this.outlineColors && this.outlineColors.length > 0;
        }

/**
     * Returns whether the paint context is in outline/wireframe mode or not
     * @return {boolean}
     */
    IFPaintContext.prototype.isOutline = function () {
        return this.outlineColors && this.outlineColors.length > 0;
    };

    /**
     * Returns the current outline/wireframe color defaulting to black
     * @returns {IFColor}
     */
GPaintContext.prototype.getOutlineColor = function () {
          return this.outlineColors && this.outlineColors.length > 0
            ? this.outlineColors[this.outlineColors.length - 1]
            : n.BLACK;
        }

GPaintContext.prototype.getRootCanvas = function () {
          return this.canvasStack.length > 0
            ? this.canvasStack[0]
            : this.canvas;
        }

GPaintContext.prototype.pushCanvas = function (e) {
          var t = this.canvas;
          return this.canvasStack.push(this.canvas), (this.canvas = e), t;
        }

GPaintContext.prototype.popCanvas = function () {
          if (this.canvasStack.length <= 0)
            throw new Error("Invalid call, stack length is zero.");
          this.canvas = this.canvasStack.pop();
        }

GPaintContext.prototype.isIncludingInvisible = function () {
          return false;
        }

/**
     * Returns the current outline/wireframe color defaulting to black
     * @returns {IFColor}
     */
    IFPaintContext.prototype.getOutlineColor = function () {
        if (this.outlineColors && this.outlineColors.length > 0) {
            return this.outlineColors[this.outlineColors.length - 1];
        } else {
            // TODO : Take this from configuration, instead?
            return IFColor.BLACK;
        }
    };

    /** @override */
GPaintContext.prototype.toString = function () {
          return "[Object GPaintContext]";
        }

GPaintContext.prototype.destroy = function () {
          for (; this.canvasStack.length; ) {
            this.canvasStack.pop().destroy();
          }
          (this.canvas = null),
            (this.canvasStack = null),
            (this.configuration = null);
        }

module.exports = GPaintContext;
