/**
 * Webpack Module #1670
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    n(4), n(32), n(33);
    n(1);
    n(85), n(1671);
    function o(e) {
      this._storage = e;
    }
    (o.prototype._plugins = null),
      (o.prototype._storage = null),
      (o.prototype.load = function () {
        try {
          (this._plugins = this._storage.getPlugins()),
            this._plugins &&
              this._plugins.forEach((e) => {
                try {
                  e.load(this._storage);
                } catch (e) {
                  console.error("PluginManager: Could not load plugin", e);
                }
              });
        } catch (e) {
          console.error("PluginManager: Could not load plugins", e);
        }
      }),
      (o.prototype.init = function (e) {
        if (this._plugins && this._plugins.length) {
          let t = () => ({
              actions: [],
              sidebars: [],
              panels: [],
              tools: [],
              properties: [],
            }),
            n = t();
          this._plugins.forEach((e) => {
            try {
              let o = t();
              e.init(o),
                Object.keys(o).forEach((e) => {
                  n[e] = n[e].concat(o[e]);
                });
            } catch (e) {
              console.error("PluginManager: Could not initilize plugin", e);
            }
          }),
            Object.keys(n).forEach((t) => {
              e[t] = e[t].concat(n[t]);
            });
        }
      }),
      (o.prototype.start = function () {
        this._plugins &&
          this._plugins.length &&
          this._plugins.forEach((e) => {
            try {
              e.start();
            } catch (e) {
              console.error("PluginManager: Could not start plugin", e);
            }
          });
      }),
      (o.prototype.unload = function (e) {
        this._plugins &&
          this._plugins.length &&
          this._plugins.forEach((t) => {
            try {
              t.unload(this._storage, e);
            } catch (e) {
              console.error("PluginManager: Could not unload plugin", e);
            }
          });
      }),
      (e.exports = o);
  }