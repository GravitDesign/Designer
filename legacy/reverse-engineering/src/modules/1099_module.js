/**
 * Webpack Module #1099
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(10);
    class i extends o.License {
      isExpired(e) {
        return super.isExpired(e || gDesigner.now());
      }
      isSpecialPriceExpired(e) {
        return super.isSpecialPriceExpired(e || gDesigner.now());
      }
      isOfflinePeriodExpired(e) {
        return super.isOfflinePeriodExpired(e || gDesigner.now());
      }
    }
    e.exports = i;
  }