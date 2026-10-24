/**
 * Webpack Module #340
 * Type: class
 * Name: GTouchTool
 */

function (e, t, n) {
    "use strict";
    function o(e) {
      Object.assign(this, e);
    }
    n(30),
      n(3),
      (o.prototype.def = !1),
      (o.prototype.id = null),
      (o.prototype.sidebar = null),
      (o.prototype.icon = null),
      (o.prototype.panel = null),
      (o.prototype.toolbar = null),
      (o.prototype.activate = function () {}),
      (o.prototype.deactivate = function () {}),
      (o.prototype.toString = function () {
        return "[Object GTouchTool]";
      }),
      (o.APPEARANCE_TOUCH_TOOL = new o({
        id: "appearance",
        icon: "gravit-icon-touch-appearance-panel",
        panel: ".appearance-property-panel",
        panelWidth: "380px",
        toolbar: ".appearance-toolbar",
      })),
      (e.exports = o);
  }