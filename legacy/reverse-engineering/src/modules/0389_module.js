/**
 * Webpack Module #389
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(1);
    function i() {}
    (i.GVDESIGN = {
      ext: "gvdesign",
      mime: "application/gravit+design",
      name: new o.GLocaleKey("GDocument", "file-type.gvdesign"),
      title: new o.GLocaleKey("GDocument", "title.save-gvdesign"),
      category: "gravit",
      load: !0,
      store: !0,
      import_image: !1,
      default: !0,
    }),
      (i.HEIC = {
        ext: "heic",
        mime: "image/heic",
        name: new o.GLocaleKey("GDocument", "file-type.png"),
        category: "image",
        load: !0,
        store: !1,
        import_image: !0,
      }),
      (i.PNG = {
        ext: "png",
        mime: "image/png",
        name: new o.GLocaleKey("GDocument", "file-type.png"),
        category: "image",
        load: !0,
        store: !0,
        import_image: !0,
      }),
      (i.JPG = {
        ext: "jpg",
        mime: "image/jpeg",
        name: new o.GLocaleKey("GDocument", "file-type.jpeg"),
        category: "image",
        load: !0,
        store: !0,
        import_image: !0,
      }),
      (i.JPEG = {
        ext: "jpeg",
        mime: "image/jpeg",
        category: "image",
        load: !0,
        import_image: !0,
      }),
      (i.SVG = {
        ext: "svg",
        mime: "image/svg+xml",
        name: new o.GLocaleKey("GDocument", "file-type.svg"),
        category: "vector",
        load: !0,
        store: !0,
        import_image: !0,
      }),
      (i.SVGZ = {
        ext: "svgz",
        mime: "image/svg+xml",
        name: new o.GLocaleKey("GDocument", "file-type.svgz"),
        category: "vector",
        load: !0,
        store: !1,
        import_image: !0,
      }),
      (i.PDF = {
        ext: "pdf",
        mime: "application/pdf",
        name: new o.GLocaleKey("GDocument", "file-type.pdf"),
        category: "document",
        load: !0,
        store: !0,
        import_image: !0,
      }),
      (i.AI = {
        ext: "ai",
        mime: "application/pdf",
        name: new o.GLocaleKey("GDocument", "file-type.ai"),
        category: "document",
        load: !0,
        store: !1,
        import_image: !0,
        pro: !0,
      }),
      (i.EPS = {
        ext: "eps",
        mime: "application/postscript",
        name: new o.GLocaleKey("GDocument", "file-type.eps"),
        category: "document",
        load: !0,
        store: !1,
        import_image: !0,
        pro: !0,
      }),
      (i.SKETCH = {
        ext: "sketch",
        mime: "application/zip",
        name: new o.GLocaleKey("GDocument", "file-type.sketch"),
        category: "document",
        load: !0,
        store: !1,
        import_image: !0,
        pro: !0,
      }),
      (i.ZIP = {
        ext: "zip",
        mime: "application/zip",
        load: !1,
        store: !1,
        import_image: !1,
      }),
      (i.getFileTypesArray = function () {
        return [i.GVDESIGN, i.PNG, i.HEIC, i.JPG, i.JPEG, i.SVG, i.PDF, i.EPS];
      }),
      (e.exports = i);
  }