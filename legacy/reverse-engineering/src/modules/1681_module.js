/**
 * Webpack Module #1681
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    n(8);
    const o = n(44),
      { gApi: i } = n(10),
      a = n(1350);
    e.exports = class {
      async open(e) {
        try {
          gContainer.openExternalLink(null, e);
          return a.getInstance().waitForPurchase();
        } catch (e) {
          o.alert(i.formatError(e));
        }
      }
    };
  }