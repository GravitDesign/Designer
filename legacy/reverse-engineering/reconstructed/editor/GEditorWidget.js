/**
 * GEditorWidget
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GEditorWidget() {
  // Constructor (reconstructed)
}

// Prototype methods
GEditorWidget.prototype._handleDrop = function (e, t) {
          var i = this.getViewTransform(this._scene).mapPoint(e),
            o = this.getViewTransform(this._scene.getActivePage()).mapPoint(e);
          if (t.files && t.files.length > 0) {
            if (this._editor.hasEventListeners(m.FileDropEvent))
              for (var a = 0; a < t.files.length; ++a)
                this._editor.trigger(new m.FileDropEvent(t.files[a], o));
          } else if (t.types && t.types.length > 0) {
            var s = [],
              l = false;
            for (a = 0; a < t.types.length; ++a) {
              var h = t.types[a],
                A = t.getData(h);
              if (A) {
                var p = null,
                  u = null;
                switch (h) {
                  case n.MIME_TYPE:
                    (p = _.DropType.Pattern), (u = n.deserialize(A));
                    break;
                  case r.MIME_TYPE:
                    (p = _.DropType.Node),
                      (u = r.deserialize(A)) instanceof T &&
                        (u = this._handleSymbolDrop(u));
                    break;
                  case _.DROP_MIME_TYPE_FONT_FAMILY:
                    (p = _.DropType.FontFamily), (u = A);
                    break;
                  case _.DROP_MIME_TYPE_CUSTOM:
                    this._editor.hasEventListeners(m.CustomDropEvent) &&
                      this._editor.trigger(new m.CustomDropEvent(A, o));
                    break;
                  case "text/plain":
                    (p = _.DropType.Text), (u = A);
                    break;
                  default:
                    continue;
                }
                if (
                  (s.push({
                    type: p,
                    source: u,
                  }),
                  null !== p)
                ) {
                  var d = this._scene.hitTest(
                    e,
                    this.getWorldTransform(this._scene),
                    null,
                    !0,
                    -1,
                    c.pickDistance,
                    !0,
                    this._dropHitFilter,
                    !1,
                    !1,
                    this._viewConfiguration.multiPageView
                  );
                  if (d && d.length > 0)
                    for (var y = 0; y < d.length; ++y) {
                      var v = d[y],
                        C = _.createEditor(v.element);
                      if (C) {
                        for (var w = null, E = v.element; E; ) {
                          if (E instanceof b) {
                            w = this.getViewTransform(E).mapPoint(e);
                            break;
                          }
                          E = E.getParent();
                        }
                        if (w && C.acceptDrop(w, p, u, v.data)) {
                          l = true;
                          break;
                        }
                      }
                    }
                }
              }
            }
            if (!l)
              for (a = 0; a < s.length; ++a) {
                (p = s[a].type), (u = s[a].source);
                if (p === _.DropType.Node && u instanceof g) {
                  if (u instanceof T) {
                    var B = u.getGeometryBBox();
                    if (B) {
                      var x = B.getX(),
                        P = B.getY();
                      u.transform(
                        new f(1, 0, 0, 1, -x + o.getX(), -P + o.getY()),
                        !0
                      );
                    }
                  } else u.transform(new f(1, 0, 0, 1, o.getX(), o.getY()), !0);
                  this._editor.updateByMousePosition(
                    i,
                    null,
                    !1,
                    this._viewConfiguration
                  );
                  var S = [],
                    R = [],
                    D = u.accept(
                      function (e) {
                        return (
                          !!(e instanceof T && e.isMaster()) &&
                          (S.push(e.getMultireferenceId()), R.push(e), !0)
                        );
                      },
                      !1,
                      !0
                    );
                  D && this._editor.beginTransaction(),
                    this._editor.insertElements([u], !0, D, !0),
                    D &&
                      (this._scene.acceptChildren(
                        function (e) {
                          if (e instanceof T && !e.isMaster()) {
                            var t = S.indexOf(e.getProperty("masterMultiRef"));
                            if (t >= 0) {
                              var i = R[t];
                              this._scene.link(i, e),
                                e.setProperty("masterRef", i.getReferenceId());
                            }
                          }
                        }.bind(this)
                      ),
                      this._editor.commitTransaction(
                        I.get(
                          new F("GEditorWidget", "action.insert-master-symbol")
                        )
                      )),
                    (l = true);
                }
              }
          }
        }

GEditorWidget.prototype._dropHitFilter = function (e) {
          return !e.hasFlag(g.Flag.FullLocked);
        }

GEditorWidget.prototype.toString = function () {
          return "[Object GEditorWidget]";
        }

module.exports = GEditorWidget;
