/**
 * Webpack Module #1490
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    n(8);
    const { gApi: o } = n(10),
      i = n(536);
    class a {
      static async checkMaintenance() {
        try {
          const e = await this._cache.get().catch(() => null);
          return !!e && e.isMaintenanceEnabled();
        } catch (e) {
          console.log("Maintenance status", e);
        }
        return !1;
      }
    }
    (a._cache = new i(() => o.maintenance.getStatus(), 6e4)), (e.exports = a);
  }