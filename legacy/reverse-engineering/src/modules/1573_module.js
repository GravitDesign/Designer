/**
 * Webpack Module #1573
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    n(8), n(196);
    e.exports = class {
      constructor() {
        this._promiseQueue = [];
      }
      pushPromise(e) {
        if (0 === this._promiseQueue.length) {
          const t = e();
          return (
            t.finally(() => {
              this._promiseQueue.shift();
            }),
            this._promiseQueue.push(t),
            t
          );
        }
        const t = this._promiseQueue.length,
          n = this._promiseQueue[t - 1],
          o = new Promise((t) => {
            n.then(() => {
              e().then(t);
            });
          });
        return (
          o.finally(() => {
            this._promiseQueue.shift();
          }),
          this._promiseQueue.push(o),
          o
        );
      }
    };
  }