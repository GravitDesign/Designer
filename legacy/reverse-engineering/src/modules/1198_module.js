/**
 * Webpack Module #1198
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    function o() {
      try {
        this._createDB();
      } catch (e) {
        (this._failedStarting = !0),
          console.log("Cannot createIndexedDB"),
          o._removeCallbacks();
      }
    }
    (o.getInstance = function (e) {
      if (!o._instance || !o._instance._dataBase || o._instance._failedStarting)
        try {
          if (
            (e && o._cb.push(e),
            (o._instance && !o._instance._failedStarting) ||
              (o._instance = new o()),
            e)
          )
            return null;
        } catch (e) {
          return (o._instance = null), void o._removeCallbacks();
        }
      return e && e(o._instance), o._instance;
    }),
      (o._removeCallbacks = function (e) {
        if (o._cb.length) {
          for (var t = 0; t < o._cb.length; t++) o._cb[t](e || null);
          o._cb = [];
        }
      }),
      (o._instance = null),
      (o._cb = []),
      (o.FONT_LIST = "_gravit_font_list_"),
      (o.NATIVE_FONT_LIST = "_gravit_native_font_list_"),
      (o.NATIVE_FONT_LIST_DATE = "_gravit_native_font_list_date_"),
      (o.NATIVE_FONT_LIST_V = "_gravit_native_font_list_v_");
    var i = "gravitFonts";
    (o.prototype._cb = null),
      (o.prototype._dataBase = null),
      (o.prototype._cachingService = null),
      (o.prototype._cachingBroken = !1),
      (o.prototype._failedStarting = !1),
      (o.prototype._createDB = function () {
        try {
          (window.indexedDB =
            window.indexedDB ||
            window.webkitIndexedDB ||
            window.mozIndexedDB ||
            window.OIndexedDB ||
            window.msIndexedDB),
            (IDBTransaction =
              window.IDBTransaction ||
              window.webkitIDBTransaction ||
              window.OIDBTransaction ||
              window.msIDBTransaction);
        } catch (e) {}
        if (window.indexedDB) {
          var e = indexedDB.open("gravitFontsDB", 1);
          if (
            (e.addEventListener("error", () => {
              (this._failedStarting = !0), o._removeCallbacks();
            }),
            "done" === e.readyState)
          ) {
            if (e.error)
              throw (
                ((this._failedStarting = !0),
                new Error("Failed starting GFontDBClient"))
              );
            this._requestSuccess({ target: e });
          } else
            (e.onsuccess = this._requestSuccess.bind(this)),
              (e.onerror = function (e) {
                0;
              });
          e.onupgradeneeded = this._createStore.bind(this);
        } else o._removeCallbacks();
      }),
      (o.prototype._requestSuccess = function (e) {
        if (this._dataBase) o._removeCallbacks(this);
        else if (((this._dataBase = e.target.result), this._dataBase)) {
          if (
            ((this._dataBase.onerror = function (e) {
              0;
            }),
            this._dataBase.setVersion)
          )
            if (1 != this._dataBase.version)
              return void (this._dataBase.setVersion(1).onsuccess =
                function () {
                  this._createStore(), o._removeCallbacks(this);
                }.bind(this));
          o._removeCallbacks(this);
        }
      }),
      (o.prototype._createStore = function (e) {
        this._dataBase || (this._dataBase = e.target.result),
          this._dataBase && this._dataBase.createObjectStore(i);
      }),
      (o.prototype.ready = function () {
        return !!this._dataBase;
      }),
      (o.prototype.clear = function () {
        return $.Deferred(
          function (e) {
            this._dataBase || e.resolveWith(this, [!0]);
            try {
              var t = this._dataBase.transaction([i], "readwrite");
              try {
                var n = t.objectStore(i).clear();
                (n.onsuccess = function (t) {
                  e.resolveWith(this, [!0]);
                }.bind(this)),
                  (n.onerror = function (t) {
                    e.resolveWith(this, [!1]);
                  }.bind(this));
              } catch (t) {
                return void e.resolveWith(this, [!1]);
              }
            } catch (t) {
              0, e.resolveWith(this, [!1]);
            }
          }.bind(this)
        );
      }),
      (o.prototype.deleteItem = function (e) {
        return $.Deferred(
          function (t) {
            this._dataBase || t.resolveWith(this, [!0]);
            try {
              var n = this._dataBase.transaction([i], "readwrite");
              try {
                var o = n.objectStore(i).delete(e);
                (o.onsuccess = function (e) {
                  t.resolveWith(this, [!0]);
                }.bind(this)),
                  (o.onerror = function (e) {
                    t.resolveWith(this, [!1]);
                  }.bind(this));
              } catch (e) {
                return void t.resolveWith(this, [!1]);
              }
            } catch (e) {
              0, t.resolveWith(this, [!1]);
            }
          }.bind(this)
        );
      }),
      (o.prototype.setItem = function (e, t) {
        return $.Deferred(
          function (n) {
            this._dataBase || n.resolveWith(this, [!1]);
            try {
              var o = this._dataBase.transaction([i], "readwrite");
              try {
                var a = o.objectStore(i).put(t, e);
                (a.onsuccess = function (e) {
                  n.resolveWith(this, [!0]);
                }.bind(this)),
                  (a.onerror = function (e) {
                    n.resolveWith(this, [!1]);
                  }.bind(this));
              } catch (e) {
                return void n.resolveWith(this, [!1]);
              }
            } catch (e) {
              0, n.resolveWith(this, [!1]);
            }
          }.bind(this)
        );
      }),
      (o.prototype.updateItem = function (e, t) {
        return $.Deferred(
          function (n) {
            this._dataBase || n.resolveWith(this, [!1]),
              this.getItem(e).done((o, i) => {
                try {
                  var a = i.put(t, e);
                  (a.onsuccess = function (e) {
                    n.resolveWith(this, [!0]);
                  }.bind(this)),
                    (a.onerror = function (e) {
                      n.resolveWith(this, [!1]);
                    }.bind(this));
                } catch (e) {
                  return void n.resolveWith(this, [!1]);
                }
              });
          }.bind(this)
        );
      }),
      (o.prototype.pushArray = function (e, t) {
        return $.Deferred(
          function (n) {
            this._dataBase || n.resolveWith(this, [!1]);
            try {
              var o = this._dataBase.transaction([i], "readwrite");
              o.objectStore(i).count(e).onsuccess = function (a) {
                if (
                  (console.log("number of fonts:" + e + " " + a.target.result),
                  0 === a.target.result)
                ) {
                  try {
                    o.objectStore(i).put(t, e);
                  } catch (e) {
                    return void n.resolveWith(this, [!1]);
                  }
                  n.resolveWith(this, [!0]);
                } else
                  1 === a.target.result &&
                    this.getItem(e).done(
                      function (e, o) {
                        if (e) {
                          var i;
                          e = e.concat(t);
                          try {
                            i = o.put(e);
                          } catch (e) {
                            return void n.resolveWith(this, [!1]);
                          }
                          (i.onsuccess = function (e) {
                            n.resolveWith(this, [!0]);
                          }),
                            (i.error = function (e) {
                              n.resolveWith(this, [!1]);
                            });
                        }
                      }.bind(this)
                    );
              };
            } catch (e) {
              0, n.resolveWith(this, [!1]);
            }
          }.bind(this)
        );
      }),
      (o.prototype.getItem = function (e) {
        var t = this;
        return $.Deferred(function (n) {
          try {
            var o = this;
            t._dataBase || n.resolveWith(o, [null]);
            var a = t._dataBase.transaction([i], "readwrite").objectStore(i),
              r = a.get(e);
            (r.onsuccess = function (e) {
              var t = e.target.result;
              n.resolveWith(o, [t, a]);
            }),
              (r.onerror = function (e) {
                e.target.result;
                n.resolveWith(o, [null, a]);
              });
          } catch (e) {
            (e.name = "exception"), n.resolveWith(this, [null, a]);
          }
        });
      }),
      (e.exports = o);
  }