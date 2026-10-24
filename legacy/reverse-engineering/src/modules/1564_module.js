/**
 * Webpack Module #1564
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    n(19), n(557), n(26);
    var o = n(16);
    n(8), n(271);
    var i = (function (e, t) {
        if ("function" == typeof WeakMap)
          var n = new WeakMap(),
            o = new WeakMap();
        return (function (e, t) {
          if (!t && e && e.__esModule) return e;
          var i,
            a,
            r = { __proto__: null, default: e };
          if (null === e || ("object" != typeof e && "function" != typeof e))
            return r;
          if ((i = t ? o : n)) {
            if (i.has(e)) return i.get(e);
            i.set(e, r);
          }
          for (const t in e)
            "default" !== t &&
              {}.hasOwnProperty.call(e, t) &&
              ((a =
                (i = Object.defineProperty) &&
                Object.getOwnPropertyDescriptor(e, t)) &&
              (a.get || a.set)
                ? i(r, t, a)
                : (r[t] = e[t]));
          return r;
        })(e, t);
      })(n(10)),
      a = o(n(389)),
      r = n(1);
    const s = n(78),
      l = n(441),
      {
        PRODUCT_NAME: c,
        PRODUCT_APP_NAME: d,
        PRODUCT_BUILD_NUMBER: u,
        PRODUCT_LANGUAGE: p,
        PRODUCT_ENVIRONMENT: g,
      } = i.AmplitudeData.UserProperties;
    e.exports = class {
      constructor(e) {
        gDesigner.addEventListener(s, this._handleDocumentEvent, this),
          gDesigner.addEventListener(l, this._handleLicenseChangedEvent, this),
          (this._amplitudeHelper = e),
          this._updateUserProperties();
      }
      _updateUserProperties() {
        let e =
          arguments.length > 0 && void 0 !== arguments[0]
            ? arguments[0]
            : gDesigner.getLicense();
        this._amplitudeHelper.updateUserProperties(
          {
            [c]: i.default.DESIGNER.TITLE,
            [d]: i.default.DESIGNER.TITLE,
            [u]: gDesigner.getVersion(),
            [p]: r.GLocale.lookupLocale(r.GLocale.getLanguage()).toUpperCase(),
            [g]: "production",
          },
          e
        );
      }
      _handleLicenseChangedEvent(e) {
        this._updateUserProperties(e.license);
      }
      async _handleDocumentEvent(e) {
        switch (e.type) {
          case s.Type.Opened:
            this._amplitudeHelper.logEvent(
              i.AmplitudeData.Events.DOCUMENT_OPENED,
              {
                DOCUMENT_FILE_FORMAT:
                  this._getDocumentOpenedFileFormat(e).toLowerCase(),
                DOCUMENT_SOURCE: this._getSource(e.document),
                DOCUMENT_RECENT: gContainer.isRecentDocument(
                  e.document._storageItem
                ),
              }
            );
            break;
          case s.Type.Saving:
            const { referer: t } = e.data;
            this._isSimplifiedExporting(t)
              ? this._documentExported(e)
              : this._documentSaved(e);
        }
      }
      _documentExported(e) {
        this._amplitudeHelper.logEvent(
          i.AmplitudeData.Events.DOCUMENT_EXPORTED,
          {
            DOCUMENT_EXPORT_TYPE: i.AmplitudeData.ExportTypes.Simple,
            DOCUMENT_FILE_FORMAT: e.data.ext,
          }
        );
      }
      _documentSaved(e) {
        this._amplitudeHelper.logEvent(i.AmplitudeData.Events.DOCUMENT_SAVED, {
          DOCUMENT_FILE_FORMAT:
            this._getDocumentSavedFileFormat(e).toLowerCase(),
          DOCUMENT_DESTINATION: this._getSource(e.document),
        });
      }
      _isSimplifiedExporting(e) {
        return !!e && !e.endsWith(a.default.GVDESIGN.ext);
      }
      _getDocumentOpenedFileFormat(e) {
        return e.document.fileExtension || e.document.getExtension();
      }
      _getDocumentSavedFileFormat(e) {
        return e.data.ext || e.document.getExtension();
      }
      _getSource(e) {
        return e.isCloudFile() ? "cloud" : "local";
      }
    };
  }