/**
 * Webpack Module #436
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    n(8);
    const { GObject: o } = n(1);
    function i(e) {
      (this._app = e), (this._collaborativeFile = null);
    }
    o.inherit(i, o),
      (i.prototype.getOrCreateCollaborativeFile = async function () {
        throw "Not implemented";
      }),
      (i.prototype.createCollaborativeFile = async function () {
        throw "Not implemented";
      }),
      (i.prototype.updateCollaborativeFile = function () {
        throw "Not implemented";
      }),
      (i.prototype.getCollaborativeFile = async function () {
        throw "Not implemented";
      }),
      (i.prototype.shareWithUser = async function (e, t) {
        throw "Not implemented";
      }),
      (i.prototype.unshareWithUser = async function (e, t) {
        throw "Not implemented";
      }),
      (i.prototype.setCollaborativeFileStatus = async function (e) {
        throw "Not implemented";
      }),
      (e.exports = i);
  }