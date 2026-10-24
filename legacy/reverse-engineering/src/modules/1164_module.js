/**
 * Webpack Module #1164
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    n(8);
    const o = n(11);
    e.exports = class {
      constructor(e, t) {
        (this._worker = e), (this._user = t);
      }
      async updateFileSceneAndMetadata(e, t, n) {
        throw "Not implemented";
      }
      _request(e, t) {
        const n = o.uuid(64);
        return (
          this._worker.postMessage({
            cmd: e,
            data: t,
            id: n,
            user: this._user,
          }),
          n
        );
      }
    };
  }