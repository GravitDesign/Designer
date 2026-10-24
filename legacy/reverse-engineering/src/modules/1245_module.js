/**
 * Webpack Module #1245
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    n(57), n(8);
    var o = n(1),
      i = n(1198),
      a = n(255),
      r = n(1118);
    function s() {
      try {
        this._fontDB = i.getInstance();
      } catch (e) {
        this._fontDB = null;
      }
    }
    (s.prototype.fontDB = null),
      (s.prototype._numFiles = 0),
      (s.prototype._tmpFontList = null),
      (s.prototype._importTrialCount = 0),
      (s.prototype.import = function (e) {
        let t =
          arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : {};
        const { silent: n } = t;
        return !n && this.busy()
          ? this._importTrialCount++ > 100
            ? void e()
            : (setTimeout(
                function () {
                  this.import(e);
                }.bind(this),
                100
              ),
              void this._importTrialCount++)
          : ((this._importTrialCount = 0), this._prompt(e, t), !0);
      }),
      (s.prototype._prompt = function (e, t) {
        var n = this,
          a = gDesigner.getDefaultStorage();
        this._numLoaded = 0;
        var r = new Promise((e) => {
          this._fontDB.getItem(i.FONT_LIST).done((t) => {
            (this._tmpFontList = t || []), e(this._tmpFontList);
          });
        });
        a.openPrompt(
          [
            { ext: "ttf", mime: "font/ttf" },
            { ext: "otf", mime: "font/otf" },
            { ext: "ttc", mime: "font/collection" },
            { ext: "dfont", mime: "font/collection" },
          ],
          function (t) {
            let i =
              arguments.length > 1 && void 0 !== arguments[1]
                ? arguments[1]
                : 1;
            (n._numFiles = i),
              r.then(() => {
                t.read((t) => {
                  var i = o.GOpenTypeUtil.getFont(null, null, null, t, !0);
                  n._numFiles += i.length - 1;
                  var a = function (t, n) {
                      return n < t.length
                        ? function () {
                            this.checkAndAdd(t[n], a(t, n + 1));
                          }.bind(this)
                        : e;
                    }.bind(n),
                    r = a(i, 0);
                  r && r.call(n);
                });
              });
          },
          !0,
          t
        );
      }),
      (s.prototype.busy = function () {
        return !this._fontDB || !this._fontDB.ready() || this._numFiles > 0;
      }),
      (s.prototype.getProgress = function () {
        return 0 === this._numFiles ? 1 : this._numLoaded / this._numFiles;
      }),
      (s.prototype.ready = function () {
        return this._tmpFontList
          ? Promise.resolve(void 0)
          : new Promise((e) => {
              this._fontDB.getItem(i.FONT_LIST).done((t) => {
                (this._tmpFontList = t || []), e();
              });
            });
      }),
      (s.prototype.checkAndAdd = function (e, t) {
        var n = e.family,
          o = e.weight,
          i = e.style,
          a = e.buffer,
          r = {
            style: i,
            weight: String(o),
            family: n,
            subfamily: e.subfamily,
            displayname: e.displayname,
          };
        if (this._tmpFontList)
          for (var s = 0; s < this._tmpFontList.length; s++) {
            var l = this._tmpFontList[s];
            if (
              l.family === r.family &&
              l.weight === r.weight &&
              l.style === r.style
            ) {
              if (e.subfamily && !l.subfamily) l.subfamily = e.subfamily;
              else if (l.subfamily && l.subfamily !== r.subfamily) {
                r.family = r.family + (r.subfamily || "");
                continue;
              }
              return (
                e.displayname &&
                  !l.displayname &&
                  (l.displayname = e.displayname),
                void this._postAddAction(t)
              );
            }
          }
        else this._tmpFontList = [];
        this._tmpFontList.push(r),
          this._fontDB.updateItem(n + "_" + o + "_" + i, a).done(() => {
            this._postAddAction(t, !0);
          });
      }),
      (s.prototype._postAddAction = function (e, t) {
        this._numLoaded++,
          this._numLoaded === this._numFiles
            ? ((this._numLoaded = 0),
              (this._numFiles = 0),
              this._fontDB
                .updateItem(i.FONT_LIST, this._tmpFontList)
                .done((n) => {
                  if (
                    (t ? a.getInstance().reset(r, !0) : a.getInstance().reset(),
                    gDesigner.getWorkspace())
                  )
                    for (var o = 0; o < this._tmpFontList.length; o++) {
                      var i = this._tmpFontList[o];
                      gDesigner
                        .getWorkspace()
                        .getFontManager()
                        .getFont(i.family, i.style, parseInt(i.weight));
                    }
                  e && e();
                }))
            : e && e();
      }),
      (e.exports = s);
  }