/**
 * Webpack Module #1672
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    n(19), n(3), n(26), n(125), n(126), n(114);
    const o = n(1347);
    e.exports = class {
      static setupInAppLinkReloadAppForOnce() {
        const e = function (t) {
          let { type: n, data: i } = t;
          if (n === o.Type.OpenInAppLink) {
            gContainer.removeEventListener(o, e);
            const t = i.params,
              n = new URL(window.location.href);
            for (let e in t) n.searchParams.set(e, t[e]);
            window.location.href = n.toString();
          }
        };
        gContainer.addEventListener(o, e);
      }
    };
  }