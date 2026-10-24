/**
 * GGraph
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GGraph() {
  // Constructor (reconstructed)
}

// Prototype methods
GGraph.prototype.getEdges = function () {
          return this._edges;
        }

GGraph.prototype.getAnchors = function () {
          return this._anchors;
        }

GGraph.prototype.getData = function () {
          return this._data;
        }

GGraph.prototype.setData = function (e) {
          this._data = e;
        }

GGraph.prototype.addEdge = function (e) {
          this._edges[e.getId()] = e;
        }

GGraph.prototype.interconnectAnchors = function (e, t, i) {
          var n = i.getAnchors().slice();
          if (n[0] && n[1]) {
            if (n[0] == e && n[1] == t) return;
            this.disconnectAnchors(i);
          }
          i.init(e, t), e.addOutEdge(i), t.addInEdge(i);
        }

GGraph.prototype.connectAnchors = function (e, t, i) {
          this.interconnectAnchors(e, t, i), this.addEdge(i);
        }

GGraph.prototype.addAnchor = function (e) {
          this._anchors[e.getId()] = e;
        }

GGraph.prototype.disconnectAnchors = function (e) {
          var t = e.getAnchors().slice();
          if (t[0] && t[1]) {
            var i = new n(t[0].getId()),
              r = new n(t[1].getId());
            t[0].removeOutEdge(e), t[1].removeInEdge(e), e.setAnchors([i, r]);
          }
        }

GGraph.prototype.removeEdge = function (e) {
          this.disconnectAnchors(e), this._removeEdge(e);
        }

GGraph.prototype._removeEdge = function (e) {
          this._edges[e.getId()] &&
            (delete this._edges[e.getId()], this._edges || (this._edges = {}));
        }

GGraph.prototype.removeAnchor = function (e) {
          for (var t = e.getOutEdges().slice(), i = 0; i < t.length; ++i) {
            var n = t[i];
            this.removeEdge(n);
          }
          t = e.getInEdges().slice();
          for (i = 0; i < t.length; ++i) {
            n = t[i];
            this.removeEdge(n);
          }
          this._removeAnchor(e);
        }

GGraph.prototype._removeAnchor = function (e) {
          this._anchors[e.getId()] &&
            (delete this._anchors[e.getId()],
            this._anchors || (this._anchors = {}));
        }

GGraph.prototype.dfsPartitioner = function (e, t, i, n) {
          var o = new r.ColorMap(),
            a = this._getInternalMapAsArray(this._anchors),
            s = this._getInternalMapAsArray(this._edges);
          if (a && s) {
            o.initWhite(a);
            var l = new r.ColorMap();
            l.initWhite(s);
            for (var h = n || o.getFirstOfColor(r.ColorMap.Colors.White); h; ) {
              var A = new r.ColorMap();
              A.initWhite(a);
              var c = new r.ColorMap();
              c.initWhite(s), this.depthFirstSearch(e, t, h, A, c);
              var p = c.getItemsOfColor(r.ColorMap.Colors.Black),
                u = A.getItemsOfColor(r.ColorMap.Colors.Black);
              i && i(u, p);
              for (var d = 0; d < u.length; ++d)
                o.setColor(u[d], r.ColorMap.Colors.Black);
              for (d = 0; d < p.length; ++d)
                l.setColor(p[d], r.ColorMap.Colors.Black);
              h = o.getFirstOfColor(r.ColorMap.Colors.White);
            }
          }
        }

GGraph.prototype.depthFirstSearch = function (e, t, i, n, o) {
          n.setColor(i, r.ColorMap.Colors.Gray), t && t(i);
          for (
            var a = function (i, a) {
                var s = false;
                o.getColor(i) === r.ColorMap.Colors.White &&
                  (o.setColor(i, r.ColorMap.Colors.Black),
                  e && (s = !!(s = e(i)))),
                  s ||
                    n.getColor(a) !== r.ColorMap.Colors.White ||
                    this.depthFirstSearch(e, t, a, n, o);
              }.bind(this),
              s = i.getOutEdges(),
              l = 0;
            l < s.length;
            ++l
          ) {
            var h = (c = s[l]).getDestination();
            a(c, h);
          }
          var A = i.getInEdges();
          for (l = 0; l < A.length; ++l) {
            var c;
            h = (c = A[l]).getSource();
            a(c, h);
          }
          n.setColor(i, r.ColorMap.Colors.Black);
        }

GGraph.prototype._getInternalMapAsArray = function (e) {
          for (
            var t = Object.keys(e), i = new Array(t.length), n = 0;
            n < t.length;
            ++n
          )
            i[n] = e[t[n]];
          return i;
        }

GGraph.prototype.toString = function () {
          return "[Object GGraph]";
        }

module.exports = GGraph;
