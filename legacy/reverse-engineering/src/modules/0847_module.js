/**
 * Webpack Module #847
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(16);
    Object.defineProperty(t, "__esModule", { value: !0 }),
      (t.cdrFormatVersionToReleaseYear = function (e) {
        return parseFloat(e) + 2e3 - 2;
      }),
      (t.prepareCDRforSaving = t.default = void 0),
      (t.releaseYearToCdrFormatVersion = function (e) {
        return e && e >= 2020 ? e - 2e3 + 2 : 0;
      }),
      n(193),
      n(8);
    var i = n(1),
      a = o(n(217)),
      r = o(n(86));
    const s = n(1101),
      l = (t.prepareCDRforSaving = async function (e, t, n, o, l) {
        if (!gDesigner.getCDRIntegrationEngine()) return t(), !1;
        const c = await gDesigner.getUser();
        n.userName = c
          ? c.getFullUserName()
          : i.GLocale.get(
              new i.GLocaleKey("GDocument", "text.default-export-author")
            );
        const d = (n) => {
          if (
            (n.status !== r.default.Saving &&
              e.removeEventListener(a.default, d),
            n.status === r.default.SaveFailed)
          ) {
            let e = "unexpected";
            try {
              if (
                n.data &&
                n.data instanceof s &&
                n.data.errCode == s.Type.TooBigFileSize
              ) {
                e = "expected.too-big-file-size";
                let n = new Error(
                  this.getTitle() +
                    ": " +
                    i.GLocale.get(
                      new i.GLocaleKey(
                        "GCommonNames",
                        "text.file-too-large-cannot-be-processed"
                      )
                    )
                );
                (n.code = 507), t(n);
              }
            } finally {
              gDesigner.stats("filespanel_export_cdr-failed", e);
            }
          } else
            n.status === r.default.Saved &&
              gDesigner.stats("filespanel_export_cdr-ok");
        };
        return (
          e.addEventListener(a.default, d),
          gDesigner.getCDRIntegrationEngine().saveCDRDocument(
            e,
            n,
            async (e) => {
              l(e);
            },
            t,
            o
          )
        );
      });
    t.default = { prepareCDRforSaving: l };
  }