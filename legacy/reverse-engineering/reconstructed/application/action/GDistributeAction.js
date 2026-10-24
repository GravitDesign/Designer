/**
     * Action for distributing
     * @class GDistributeAction
     * @extends GAction
     * @constructor
     */

function GDistributeAction() {
  // Constructor (reconstructed)
}

// Prototype methods
GDistributeAction.prototype.getTooltipConfig = function (e) {
        return (
          (e && l.TOOLTIP_CONFIG[e] && l.TOOLTIP_CONFIG[e][this._type]) || null
        );
      }

/** @override */
GDistributeAction.prototype.toString = function () {
        return "[Object GDistributeAction]";
      }

module.exports = GDistributeAction;
