/**
 * Webpack Module #445
 * Type: class
 * Name: GSaveAsAction
 */

function (e, t, n) {
    "use strict";
    n(32), n(33);
    var o = n(16),
      i = o(n(1504));
    n(58),
      n(30),
      n(8),
      n(20),
      n(3),
      n(271),
      n(71),
      n(34),
      n(4),
      n(41),
      n(13),
      n(38);
    var a = n(1),
      r = n(15),
      s = n(67),
      l = o(n(1248)),
      c = n(10);
    function d(e, t) {
      var n = Object.keys(e);
      if (Object.getOwnPropertySymbols) {
        var o = Object.getOwnPropertySymbols(e);
        t &&
          (o = o.filter(function (t) {
            return Object.getOwnPropertyDescriptor(e, t).enumerable;
          })),
          n.push.apply(n, o);
      }
      return n;
    }
    function u(e) {
      for (var t = 1; t < arguments.length; t++) {
        var n = null != arguments[t] ? arguments[t] : {};
        t % 2
          ? d(Object(n), !0).forEach(function (t) {
              (0, i.default)(e, t, n[t]);
            })
          : Object.getOwnPropertyDescriptors
          ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(n))
          : d(Object(n)).forEach(function (t) {
              Object.defineProperty(
                e,
                t,
                Object.getOwnPropertyDescriptor(n, t)
              );
            });
      }
      return e;
    }
    var p = n(163),
      g = n(18),
      h = n(31),
      f = n(446),
      m = n(86);
    const y = n(44),
      v = n(389);
    var _ = c.FILE_FORMATS.map((e) => e.ext);
    const b = c.FILE_FORMATS.find((e) => e.default).ext;
    function w(e) {
      let t =
        arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : {};
      (this._fileExt = e), (this._isNativeExt = !!_.includes(this._fileExt));
      var n = p.FileTypes.filter((t) => t.ext === e)[0];
      (this._title = n.title || n.name),
        (this._mime = n.mime),
        (this._options = t),
        (w.TOOLTIP_CONFIG = {
          [s.TOOLTIP_AREA.MAIN_MENU.TRY_PRO_COMMON]: s.GRichTooltipConfig.from({
            title: a.GLocale.get(
              new a.GLocaleKey(
                "GSaveAsAction",
                "text.try-this-feature-pro-tooltip-title"
              )
            ),
            learnMore: "",
            upgradeToProStatsValue: "file.save-as.pdf.300",
            middle: !1,
            side: !0,
          }),
        });
    }
    a.GObject.inherit(w, h),
      (w.ID = "file.save-as"),
      (w.TOOLTIP_CONFIG = null),
      (w.DEFAULT_SAVE_OPTIONS = {}),
      (w.prototype._fileExt = null),
      (w.prototype._isNativeExt = !1),
      (w.prototype._title = null),
      (w.prototype._mime = null),
      (w.prototype._options = null),
      (w.prototype.getId = function () {
        if ("pdf" === this._fileExt) {
          const e = this._options && this._options.dpi;
          if (e && 72 !== e) return w.ID + "." + this._fileExt + "." + e;
        }
        return w.ID + "." + this._fileExt;
      }),
      (w.prototype.getTitle = function () {
        if (this._isNativeExt)
          return gDesigner.getDefaultStorage().canSave()
            ? a.GLocale.get(this._title)
            : a.GLocale.get(
                new a.GLocaleKey("GDocument", "title.download-" + this._fileExt)
              );
        if ("pdf" === this._fileExt) {
          var e = this._options.dpi ? this._options.dpi : 72;
          return a.GLocale.get(
            new a.GLocaleKey("GSaveAsAction", "text.dpi-value")
          )
            .replace("%dpiValue", e)
            .replace(
              "%dpiString",
              a.GLocale.get(new a.GLocaleKey("GSaveAsAction", "text.dpi"))
            );
        }
        {
          const { dpi: e = 72 } = this._options;
          return a.GLocale.get(
            new a.GLocaleKey(
              "GSaveAsAction",
              "pdf" === this._fileExt ? "text.save-pdf" : "text.save-common"
            )
          )
            .replace("%title", a.GLocale.get(this._title))
            .replace("%fileExtension", this._fileExt)
            .replace("%dpiValue", e)
            .replace(
              "%dpiString",
              a.GLocale.get(new a.GLocaleKey("GSaveAsAction", "text.dpi"))
            );
        }
      }),
      (w.prototype.getCategory = function () {
        return this._isNativeExt
          ? g.CATEGORY_FILE
          : "pdf" === this._fileExt
          ? g.CATEGORY_FILE_EXPORT_PDF
          : g.CATEGORY_FILE_EXPORT;
      }),
      (w.prototype.getGroup = function () {
        return this._isNativeExt
          ? "file"
          : "pdf" === this._fileExt
          ? "export/file-type/" + this._fileExt
          : "export/file-type";
      }),
      (w.prototype.isPro = function () {
        return "pdf" === this._fileExt && 300 === this._options.dpi;
      }),
      (w.prototype.getTooltipArea = function () {
        return s.TOOLTIP_AREA.MAIN_MENU.TRY_PRO_COMMON;
      }),
      (w.prototype.getTooltipConfig = function (e) {
        return (
          ("file.save-as.pdf.300" === this.getId() &&
            e &&
            w.TOOLTIP_CONFIG[e]) ||
          null
        );
      }),
      (w.prototype.getShortcut = function () {
        return this._isNativeExt
          ? [
              r.GKey.Constant.SHIFT,
              r.GKey.Constant.META,
              r.GKey.Constant.OPTION,
              "S",
            ]
          : null;
      }),
      (w.prototype.isEnabled = function (e, t) {
        return (
          !!gDesigner
            .getApplicationManager()
            .isFileFormatEnabledForSaveAs({ ext: this._fileExt }) &&
          !!gDesigner.getApplicationManager().isSavingAsEnabled() &&
          !!(t = t || gDesigner.getActiveDocument()) &&
          ((e =
            e ||
            (t.getStorageItem()
              ? t.getStorageItem().getStorage()
              : gDesigner.getDefaultStorage())).canPromptSave() ||
            e.canDownload())
        );
      }),
      (w.prototype.execute = function (e, t, n) {
        let o =
            arguments.length > 3 && void 0 !== arguments[3]
              ? arguments[3]
              : w.DEFAULT_SAVE_OPTIONS,
          i = arguments.length > 4 ? arguments[4] : void 0;
        const a = t || gDesigner.getActiveDocument();
        if (a && a.isCommercialProductFile())
          return a.openPaywall(this.getId()), !1;
        new f(
          () => {
            this._performSave(e, a, n, o, i);
          },
          () => {
            gDesigner.stats("action_cancelled_anonymous", this.getId());
          }
        );
      }),
      (w.prototype._performSave = async function (e, t, n) {
        let o =
            arguments.length > 3 && void 0 !== arguments[3] ? arguments[3] : {},
          i = arguments.length > 4 ? arguments[4] : void 0,
          r = i;
        if (
          (t.isCloudFile() &&
            (this._fileExt === b &&
              t.getScene().setCloudSynchronization(t.getStorageItem().getId()),
            (o.lastModifiedDate = t.isModified()
              ? void 0
              : t.getScene().getLastSavedTime())),
          (e =
            e ||
            (t.getStorageItem()
              ? t.getStorageItem().getStorage()
              : gDesigner.getDefaultStorage())),
          !(await this._checkWriteAccess(e)))
        )
          return;
        o.referer = this.getId();
        const s = !e.canDownload() || this._fileExt !== v.PDF.ext;
        if (e.canPromptSave() && s) {
          const i = t.getStorageItem();
          !r && i && (r = i.getName()),
            r || (r = t.getTitle()),
            r &&
              !r.endsWith(this._fileExt) &&
              (r += ".".concat(this._fileExt.toLowerCase())),
            e.savePrompt(
              r,
              this._getFileTypes(t, e),
              async (e) => {
                _.includes((e.getExtension() || "").toLowerCase()) &&
                  t.setStorageItem(e);
                let i = this._fileExt !== b || !t.isCloudFile();
                await t.saveAnnotations(i),
                  (o = t.updateSaveOptionsLastModifiedDate(o)),
                  (o.singleton = !t.isCloudFile()),
                  (o = this._updateSaveOptions(o, t, e)),
                  t.store(
                    e,
                    n,
                    this._showError,
                    o instanceof l.default
                      ? o
                      : Object.assign({}, this._options, o)
                  );
              },
              () => {
                n && n({ documentStatus: m.SaveCancelled });
              }
            );
        } else if (e.canDownload()) {
          if (
            (r || (t.getStorageItem() && (r = t.getStorageItem().getName())),
            (r = r || t.getTitle() || "Design"),
            !this._isNativeExt && t.hasPagesWithInfiniteEmptyCanvas())
          )
            return void y.alert(
              a.GLocale.get(
                new a.GLocaleKey(
                  "GCommonNames",
                  "text.error-emtpy-infinite-canvas"
                )
              )
            );
          (o = t.updateSaveOptionsLastModifiedDate(o)),
            (o.singleton = !t.isCloudFile()),
            (o = u(u({}, w.DEFAULT_SAVE_OPTIONS), o)),
            e.download(r + "." + this._fileExt, (e) => {
              e &&
                t.store(
                  e,
                  n,
                  this._showError,
                  Object.assign({}, this._options, o, { filename: r })
                );
            });
        }
      }),
      (w.prototype._checkWriteAccess = async function (e) {
        const t = gContainer.getDefaultStorageDestination(this._fileExt);
        if (t) {
          const n = await e.getWritePermission(t),
            o = n.isAuthorized();
          return (
            !o && n.getStatusText() && this._showError(n.getStatusText()), o
          );
        }
        return !0;
      }),
      (w.prototype._showError = function (e) {
        e && y.error(e, { showTitle: !1 });
      }),
      (w.prototype._getFileTypes = function () {
        return [{ ext: this._fileExt, mime: this._mime }];
      }),
      (w.prototype._updateSaveOptions = function (e) {
        return e;
      }),
      (w.prototype.toString = function () {
        return "[Object GSaveAsAction]";
      }),
      (e.exports = w);
  }