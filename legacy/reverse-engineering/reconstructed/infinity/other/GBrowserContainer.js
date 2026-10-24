/**
 * GBrowserContainer
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GBrowserContainer() {
  // Constructor (reconstructed)
}

// Prototype methods
GBrowserContainer.prototype.openStorageFile = function (e, t, n) {
        E.openStorageFile(e, t, n, this._storage);
      }

GBrowserContainer.prototype.handleDeepLinking = function (e) {
        const t = r.prototype.handleDeepLinking.call(this, e),
          n = [
            r.DeepLinking.DirectLink,
            r.DeepLinking.FocusAnnot,
            r.DeepLinking.CreateShare,
          ];
        return (
          t &&
            !n.includes(t.link) &&
            window.history.pushState(null, null, window.location.pathname),
          t
        );
      }

GBrowserContainer.prototype.toString = function () {
        return "[Object GBrowserContainer]";
      }


module.exports = GBrowserContainer;
