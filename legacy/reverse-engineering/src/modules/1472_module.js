/**
 * Webpack Module #1472
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    let o;
    n(19), n(8), n(26);
    class i {
      static async getInstance() {
        if (!o) {
          const e = await n.e(12).then(n.t.bind(null, 1740, 7));
          o = e.default;
        }
        return new i();
      }
      parse(e) {
        return o({ blob: e });
      }
    }
    e.exports = i;
  }