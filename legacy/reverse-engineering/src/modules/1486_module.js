/**
 * Webpack Module #1486
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(16);
    n(30), n(4), n(41);
    var i = n(1154),
      a = o(n(389)),
      r = o(n(163)),
      s = o(n(1245)),
      l = n(1);
    e.exports = {
      debugDownloadPNG: function () {
        (0, i.downloadActiveFile)(a.default.PNG.ext);
      },
      debugDownloadPDF: function (e) {
        (0, i.downloadActiveFile)(a.default.PDF.ext, {
          dpi: e || l.GLength.DPI,
        });
      },
      debugDownloadSVG: function () {
        (0, i.downloadActiveFile)(a.default.SVG.ext);
      },
      debugDownloadJPEG: function () {
        (0, i.downloadActiveFile)(a.default.JPG.ext);
      },
      debugOpenFile: function (e) {
        let t =
          arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : {};
        const n = gDesigner.getDefaultStorage(),
          o = Object.assign({ disableFileSystemAccessAPI: !0, silent: !0 }, t);
        n.openPrompt(
          r.default.FileTypes.filter((e) => e.load),
          (t) => {
            gDesigner.openDocument(t), e && e();
          },
          !1,
          o
        );
      },
      debugImportFont: function (e) {
        let t =
          arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : {};
        const n = Object.assign(
            { disableFileSystemAccessAPI: !0, silent: !0 },
            t
          ),
          o = new s.default();
        o.import(e, n);
      },
    };
  }