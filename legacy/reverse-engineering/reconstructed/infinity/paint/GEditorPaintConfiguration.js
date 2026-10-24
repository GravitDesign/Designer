/**
     * A paint configuration for editor painting
     * @class GEditorPaintConfiguration
     * @constructor
     * @extends IFScenePaintConfiguration
     */

function GEditorPaintConfiguration() {}

// Prototype methods
/**
     * Whether to render pages or not
     * @type {Boolean}
     */
    IFEditorPaintConfiguration.prototype.pagesVisible = true;

    /**
     * Whether to render the grid or not if it is active
     * @type {Boolean}
     */
    IFEditorPaintConfiguration.prototype.gridVisible = true;

    /** @override */
GEditorPaintConfiguration.prototype.toString = function () {
          return "[Object GEditorPaintConfiguration]";
        }

module.exports = GEditorPaintConfiguration;
