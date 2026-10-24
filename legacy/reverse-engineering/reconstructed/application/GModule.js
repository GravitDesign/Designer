/**
     * The base for a module
     * @class GModule
     * @constructor
     * @version 1.0
     */

function GModule(e) {
      (this.id = e), (this._intervals = []), (this._timeouts = []);
    }

// Prototype methods
GModule.prototype.start = function () {
        this._plugins &&
          this._plugins.length &&
          this._plugins.forEach((e) => {
            try {
              e.start();
            } catch (e) {
              console.error("PluginManager: Could not start plugin", e);
            }
          });
      }

GModule.prototype.unload = function (e) {
        this._plugins &&
          this._plugins.length &&
          this._plugins.forEach((t) => {
            try {
              t.unload(this._storage, e);
            } catch (e) {
              console.error("PluginManager: Could not unload plugin", e);
            }
          });
      }

GModule.prototype.setTimeout = function () {
        let e = setTimeout.apply(null, arguments);
        return this._timeouts.push(e), e;
      }

GModule.prototype.setInterval = function () {
        let e = setInterval.apply(null, arguments);
        return this._intervals.push(e), e;
      }

GModule.prototype.unload = function () {
        this._timeouts.forEach((e) => clearTimeout(e)),
          this._intervals.forEach((e) => clearInterval(e)),
          (this._timeouts = []),
          (this._intervals = []);
      }

GModule.prototype.toString = function () {
        return "[Object GModule]";
      }

module.exports = GModule;
