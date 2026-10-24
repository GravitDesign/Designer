/**
     * An event whenever the selection has been changed
     * @class GEditor.SelectionChangedEvent
     * @extends GEvent
     * @constructor
     */

function GEditor() {
  // Constructor (reconstructed)
}

// Prototype methods
GEditor.prototype.blinkSelection = function (e, t) {
          if (this._selection && this._selection.length) {
            var i = this._selection.slice(),
              r = function () {
                this.clearHighlighted();
              }.bind(this),
              o = function () {
                for (var e = 0; e < i.length; ++e)
                  i[e].setFlag(n.Flag.Highlighted);
              },
              a = e / t;
            o();
            var s = setInterval(o, a),
              l = 0;
            setTimeout(function () {
              r(), (l = setInterval(r, a));
            }, a / 2),
              setTimeout(
                function () {
                  clearInterval(s), clearInterval(l), r();
                }.bind(this),
                e - a / 3
              );
          }
        }

GEditor.prototype.getEdTransformSettings = function () {
          return this._edTrfSettings;
        }

GEditor.prototype.setFullContentTransform = function (e) {
          this._edTrfSettings
            ? (this._edTrfSettings.fullContentTransform = !!e)
            : (this._edTrfSettings = {
                fullContentTransform: !!e,
              });
        }

GEditor.prototype.clearEdTransformSettings = function () {
          this._edTrfSettings = null;
        }

/** @override */
GEditor.prototype.toString = function () {
          return "[Object GEditor]";
        }

GEditor.prototype._getSeqId = function (e) {
        for (var t = e; !(t instanceof S); ) t = t.getParent();
        if ("function" != typeof t.getScene) return -1;
        var i = t.getScene();
        if (!i) return -1;
        if (e === i) return -10;
        if (!ie) {
          var n = {};
          i.getSubnodeIds(n), (ie = Object.values(n));
        }
        var r = ie.indexOf(e);
        if (r < 0) throw new Error("Couldn't determine node's sequence ID");
        return r;
      }

GEditor.prototype._seqIdToNode = function (e) {
          if (-10 === e) return this._scene;
          if (e < 0) throw new Error("Invalid sequence ID");
          if (!ie) {
            var t = {};
            this._scene.getSubnodeIds(t), (ie = Object.values(t));
          }
          if (ie.length <= e) throw new Error("Sequence ID too big");
          return ie[e];
        }

GEditor.prototype._fixDebugData = function (e, t) {
          if ("function" == typeof gdb_loaddesign) {
            if (this._debugBugged || !m.debugTransactions) return;
            if (e && t)
              for (var i = 0; i < e.length; i++)
                if (e[i].elementInserted) {
                  var n = e[i].elementAction;
                  e[i].elementNode = t[n].insertedNode;
                }
          }
        }

GEditor.prototype._addDebugData = function (e, t, i) {
          if ("function" == typeof gdb_loaddesign) {
            var n = this._scene.getWorkspace()
              ? this._scene.getWorkspace().getTransactionRecorder()
              : null;
            if (
              (n &&
                (this._debugBugged = this._debugBugged || n.getDebugBugged()),
              this._debugBugged || !m.debugTransactions)
            )
              return;
            if (((ie = null), "selection" === e && t))
              for (var r = 0; r < t.length; r++) {
                var o = false;
                if (i)
                  for (var a = 0; a < i.length; a++)
                    if (
                      i[a].action.type === K.ActionType.Insert &&
                      i[a].action.node === t[r].element
                    ) {
                      (i[a].action.makeRecorded = true),
                        (o = true),
                        (t[r].elementInserted = true),
                        (t[r].elementAction = a);
                      break;
                    }
                if (!o) {
                  var s = this._getSeqId(t[r].element);
                  t[r].elementSeq = s;
                }
              }
          }
        }

module.exports = GEditor;
