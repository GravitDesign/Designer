/**
     * A target of vertices
     * @class GVertexTarget
     * @mixin
     * @constructor
     * @version 1.0
     */

function GVertexTarget() {}

// Prototype methods
GVertexTarget.prototype.getScene = function () {
            var e = this.getOwnerStylable();
            return e && e.getScene ? e.getScene() : null;
          }

/**
     * A target of vertices
     * @class IFVertexTarget
     * @mixin
     * @constructor
     * @version 1.0
     */
    function IFVertexTarget() {
    }

    /**
     * Add a new vertex to the end of this target
     * @param {Number} command the command of the vertex
     * @param {Number} [x] x-coordinate of vertex, defaults to 0
     * @param {Number} [y] y-coordinate of vertex, defaults to 0
     */
GVertexTarget.prototype.addVertex = function (command, x, y) {
        throw new Error("Not Supported");
      }

/**
     * Append another vertex source to this one
     * @param {IFVertexSource} source the source to append to this one
     * @param {Number} [index] optional index to start reading from source, defaults to 0
     */
GVertexTarget.prototype.appendVertices = function (source, index) {
          if (e.rewindVertices(t || 0))
            for (var i = new n(); e.readVertex(i); )
              this.addVertex(i.command, i.x, i.y);
        }

/**
     * Clear all vertices in this target
     * @version 1.0
     */
GVertexTarget.prototype.clearVertices = function () {
          throw new Error("Not Supported.");
        }

/**
     * Clear all vertices in this target
     * @version 1.0
     */
    IFVertexTarget.prototype.clearVertices = function () {
        throw new Error('Not Supported.');
    }

    /** @override */
GVertexTarget.prototype.toString = function () {
          return "[Object GVertexTarget]";
        }

module.exports = GVertexTarget;
