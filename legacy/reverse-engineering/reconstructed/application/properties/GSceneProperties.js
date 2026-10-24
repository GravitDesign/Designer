/**
 * GSceneProperties
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GSceneProperties() {
  // Constructor (reconstructed)
}

// Prototype methods
GSceneProperties.prototype._assignProperty = function (e, t, n) {
        this._assignProperties([e], [t], n);
      }

GSceneProperties.prototype._assignProperties = function (e, t, n) {
        var o = this._document.getEditor();
        o.beginTransaction();
        try {
          this._scene.setProperties(e, t);
        } finally {
          o.commitTransaction(n);
        }
      }

GSceneProperties.prototype._enableCloudSync = function () {
        var e = () => {
          var e = this._document;
          gDesigner.getDefaultStorage().canSave()
            ? this._document.isNew()
              ? u.createFile(e, (t) => {
                  e.getScene().setCloudSynchronization(t.id),
                    gDesigner.executeAction(
                      l.ID + v,
                      [
                        null,
                        e,
                        () => {
                          u.renameFile(t, e.getTitle(), () => {
                            e.storeToCloud(
                              e.getScene(),
                              this._updateProperties.bind(this)
                            );
                          });
                        },
                      ],
                      undefined,
                      !0
                    );
                })
              : this._document.isCloudFile()
              ? gDesigner.executeAction(l.ID + v, undefined, (undefined).true)
              : this._document.hasCloudReference()
              ? console.warn("Enable Sync for referenced file")
              : u.createFile(e, (t) => {
                  e.getScene().setCloudSynchronization(t.id),
                    e.storeToCloud(e.getScene(), () => {
                      e.store();
                    });
                })
            : this._document.isNew()
            ? gDesigner.executeAction(
                s.ID + ".save-as",
                [
                  this._document,
                  (t) => {
                    t === c.Loaded && gDesigner.removeDocument(e, null, !0);
                  },
                ],
                undefined,
                !0
              )
            : this._document.isCloudFile()
            ? gDesigner.executeAction(l.ID + v, undefined, undefined, !0)
            : this._document.hasCloudReference()
            ? console.warn("Enable Sync for referenced file")
            : gDesigner.executeAction(
                s.ID + ".save-as",
                [
                  this._document,
                  (t) => {
                    t === c.Loaded && gDesigner.removeDocument(e, null, !0);
                  },
                ],
                undefined,
                !0
              );
        };
        gDesigner.getUser().then((t) => {
          t
            ? e()
            : u.performLogin().then((t) => {
                t && e();
              });
        });
      }

GSceneProperties.prototype.toString = function () {
        return "[Object GSceneProperties]";
      }

module.exports = GSceneProperties;
