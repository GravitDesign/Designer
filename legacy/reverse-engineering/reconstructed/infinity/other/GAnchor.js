/**
 * GAnchor
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GAnchor() {}

// Prototype methods
GAnchor.prototype.getId = function () {
          return this._uid;
        }

GAnchor.prototype.getOutEdges = function () {
          return this._outEdges;
        }

GAnchor.prototype.getInEdges = function () {
          return this._inEdges;
        }

GAnchor.prototype.getData = function () {
          return this._data;
        }

GAnchor.prototype.addEdge = function (e) {}

GAnchor.prototype.addOutEdge = function (e) {}

GAnchor.prototype.addInEdge = function (e) {}

GAnchor.prototype.setData = function (e) {}

GAnchor.prototype.setOutEdges = function (e) {}

GAnchor.prototype.removeEdge = function (e) {}

GAnchor.prototype.removeOutEdge = function (e) {}

GAnchor.prototype.removeInEdge = function (e) {}

GAnchor.prototype.toString = function () {
          return "[Object GAnchor]";
        }

module.exports = GAnchor;
