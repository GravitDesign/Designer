/**
 * Webpack Module #1092
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    n(4), n(13);
    const o = n(156),
      i = n(10);
    e.exports = class {
      static createFrom(e) {
        let t = !1;
        e instanceof o && (t = !0);
        var n = o.from(e);
        n.setItemType(o.Type.File),
          t ||
            n.setPermissions([
              o.Permission.Open,
              o.Permission.Copy,
              o.Permission.Editing,
              o.Permission.Rename,
              o.Permission.CutPaste,
              o.Permission.Delete,
              o.Permission.Download,
            ]),
          n.autosave
            ? (n.setPreviewURL(n.autosave_url_t),
              n.setModificationTime(e.autosave_updated))
            : (n.setPreviewURL(n.url_t || n.url_s),
              n.setModificationTime(e.updated));
        const a = i.FILE_FORMATS.find((e) => {
          const t = n.getMimeType();
          return (
            !(!t || e.type.toLowerCase() !== t.toLowerCase()) ||
            e.ext.toLowerCase() === n.getExtension()
          );
        });
        return (
          n.setMimeType(a.type),
          (n.ext = a.ext),
          (n.extension = a.ext),
          (n.storage = o.Storage.Gravit),
          n
        );
      }
    };
  }