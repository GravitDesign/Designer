/**
 * GInstallToDesktopAction
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GInstallToDesktopAction() {}

// Prototype methods
GInstallToDesktopAction.prototype.execute = function () {
        !document.activeElement ||
        !$(document.activeElement).is(":editable") ||
        $(document.activeElement).is(":button") ||
        $(document.activeElement).is("select") ||
        gDesigner.isGravitIME(document.activeElement)
          ? gDesigner.getActiveDocument().getEditor().undoState()
          : document.execCommand("undo");
      }

GInstallToDesktopAction.prototype.getTooltipConfig = function (e) {
        return (e && l.TOOLTIP_CONFIG[e]) || null;
      }

GInstallToDesktopAction.prototype.toString = function () {
        return "[Object GUndoAction]";
      }

GInstallToDesktopAction.prototype.getId = function () {
        return l.ID;
      }

GInstallToDesktopAction.prototype.getTitle = function () {
        return l.TITLE;
      }

GInstallToDesktopAction.prototype.getCategory = function () {
        return r.default.CATEGORY_FILE;
      }

GInstallToDesktopAction.prototype.getGroup = function () {
        return "install";
      }

GInstallToDesktopAction.prototype.isAvailable = function () {
        return (
          s.default.isSupported() &&
          !window.matchMedia("(display-mode: standalone)").matches
        );
      }

GInstallToDesktopAction.prototype.isVisible = function () {
        return !window.matchMedia("(display-mode: standalone)").matches;
      }

GInstallToDesktopAction.prototype.isEnabled = function () {
        return gDesigner.hasPwaEvent();
      }




module.exports = GInstallToDesktopAction;
