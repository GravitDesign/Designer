/**
 * Webpack Module #1268
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    Object.defineProperty(t, "__esModule", { value: !0 }),
      (t.cropImage = function (e, t) {
        if (!(e instanceof o.GImage)) return;
        t &&
          a.GEditor.tryRunTransaction(
            e,
            function () {
              var t = e.getImageTransform();
              e.setProperties(["trf", "ut", "tl_sx"], [t, !0, 0]);
            },
            o.GLocale.get(
              new o.GLocaleKey("GImageProperties", "action.reset-cropping")
            )
          );
        var n = gDesigner.getToolManager();
        n.getActiveTool() instanceof a.GSubSelectTool
          ? (n.activateTool(a.GPointerTool, null, !0),
            n.getActiveTool().setEditMode(a.GSelectTool.EditMode.Select))
          : n.activateTool(a.GSubSelectTool, null, !0);
      }),
      (t.replaceImage = function (e, t) {
        if (!(e instanceof o.GImage)) return;
        var n = n || t.getStorage() || gDesigner.getDefaultStorage();
        if (n && n.canPromptOpen()) {
          const t = [
            { ext: "png", mime: "image/png" },
            { ext: "jpg", mime: "image/jpeg" },
            { ext: "jpeg", mime: "image/jpeg" },
            { ext: "gif", mime: "image/gif" },
          ];
          n.openPrompt(
            t,
            (t) => {
              t.read((t) => {
                var n = new Blob([t]);
                if (n.size > i.GPlatform.maxPngDataSize)
                  new r(
                    o.GLocale.get(
                      new o.GLocaleKey("GDocument", "text.image-too-big")
                    )
                  ).open();
                else {
                  var s = new FileReader();
                  (s.onload = () => {
                    var t = s.result;
                    if (t.length > i.GPlatform.maxImgDataUrlLength)
                      new r(
                        o.GLocale.get(
                          new o.GLocaleKey("GDocument", "text.image-too-big")
                        )
                      ).open();
                    else {
                      var n = new Image();
                      (n.onload = () => {
                        if (
                          n.naturalHeight > i.GPlatform.maxImgLinearDimension ||
                          n.naturalWidth > i.GPlatform.maxImgLinearDimension ||
                          n.naturalWidth * n.naturalHeight >
                            i.GPlatform.maxImgAreaDots
                        )
                          new r(
                            o.GLocale.get(
                              new o.GLocaleKey(
                                "GDocument",
                                "text.image-too-big"
                              )
                            )
                          ).open();
                        else {
                          var s = gDesigner.getToolManager();
                          s.activateTool(a.GPointerTool),
                            s.getActiveTool() instanceof a.GSelectTool &&
                              s
                                .getActiveTool()
                                .setEditMode(a.GSelectTool.EditMode.Select);
                          var l = e.getGeometryBBox(),
                            c = new o.GTransform().translated(
                              l.getX(),
                              l.getY()
                            );
                          a.GEditor.tryRunTransaction(
                            e,
                            () => {
                              e.setProperties(
                                ["url", "iw", "ih", "itrf"],
                                [t, n.naturalWidth, n.naturalHeight, c]
                              );
                            },
                            o.GLocale.get(
                              new o.GLocaleKey(
                                "GImageProperties",
                                "action.replace-image"
                              )
                            )
                          ),
                            s.getActiveTool() instanceof a.GSelectTool &&
                              s
                                .getActiveTool()
                                .setEditMode(a.GSelectTool.EditMode.Edit);
                        }
                      }),
                        (n.src = t);
                    }
                  }),
                    (s.onerror = function () {
                      new r(
                        o.GLocale.get(
                          new o.GLocaleKey("GDocument", "text.image-too-big")
                        )
                      ).open();
                    }),
                    s.readAsDataURL(n);
                }
              });
            },
            !1
          );
        }
      }),
      (t.setOriginSize = function (e) {
        if (!(e instanceof o.GImage)) return;
        a.GEditor.tryRunTransaction(
          e,
          function () {
            var t = e.getGeometryBBox(),
              n = t ? t.getX() : 0,
              i = t ? t.getY() : 0,
              a = new o.GTransform().translated(n, i);
            e.setProperties(
              ["trf", "itrf", "pw", "ph"],
              [a, a, e.getWidth(), e.getHeight()]
            );
          },
          o.GLocale.get(
            new o.GLocaleKey("GImageProperties", "action.reset-size")
          )
        );
      });
    var o = n(1),
      i = n(15),
      a = n(53),
      r = (n(1267), n(123), n(173), n(219));
  }