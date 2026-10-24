/**
 * Webpack Module #1663
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(16);
    n(19),
      n(168),
      n(30),
      n(57),
      n(8),
      n(20),
      n(34),
      n(134),
      n(91),
      n(4),
      n(41),
      n(13),
      n(32),
      n(38),
      n(169),
      n(1175),
      n(33),
      n(26),
      n(125),
      n(126),
      n(114);
    var i = n(1201),
      a = n(1),
      r = n(15),
      s = n(10),
      l = o(n(1664)),
      c = n(219),
      d = n(809),
      { debounce: u, stringToBase64String: p } = n(40);
    const g = l.default.getElements();
    e.exports = class {
      constructor(e) {
        (this._parent = e),
          (this._CURRENT_SKIP_COUNT = 0),
          (this._IMAGE_PAGE_COUNT = 1),
          (this._CURRENT_CATEGORY = null),
          (this._CURRENT_ROOT_CATEGORY = null),
          (this._IMAGE_ASSET_DRAINED = !1),
          (this._LOADING = !1),
          (this._wrapperWidth = 250),
          (this._debouncedResizeHandler = u(
            function () {
              var e = Array.from(this._parent.find(".assets-wrapper")).filter(
                  (e) => $(e).children().length
                ),
                t = $(e).css("width")
                  ? parseInt($(e).css("width").split("px")[0])
                  : 250;
              Math.abs(t - this._wrapperWidth) > 50 &&
                ((this._wrapperWidth = t),
                this._initMasonryLayoutColumns($(e), null, null, !0));
            }.bind(this),
            200
          ));
        var t = $("<div/>").addClass("g-library-panel").appendTo(e);
        (this._libraryPanel = t), this._createSearch(t), this._initElements(t);
      }
      _updateUI(e, t, n, o, i) {
        var r = this,
          s = i ? [] : t.children || [],
          l = e.find(".images");
        if (s.length > 0 && 0 === e.find("select").length) {
          var c = $("<select/>")
            .addClass("selector")
            .on("change", function () {
              var n,
                o = $(this).find("option:selected").data("category");
              (r._CURRENT_SKIP_COUNT = 0),
                (r._IMAGE_PAGE_COUNT = 1),
                e.find(".asset-container").remove(),
                o
                  ? ((r._CURRENT_CATEGORY = o),
                    (n =
                      (r._CURRENT_ROOT_CATEGORY &&
                        (r._CURRENT_ROOT_CATEGORY.name ||
                          r._CURRENT_ROOT_CATEGORY.path)) ||
                      r._CURRENT_ROOT_CATEGORY ||
                      "") && (n += "-"),
                    (n +=
                      (r._CURRENT_CATEGORY &&
                        (r._CURRENT_CATEGORY.name ||
                          r._CURRENT_CATEGORY.path)) ||
                      r._CURRENT_CATEGORY ||
                      ""))
                  : ((r._CURRENT_CATEGORY = t),
                    (r._CURRENT_ROOT_CATEGORY = t),
                    (n =
                      (r._CURRENT_CATEGORY &&
                        (r._CURRENT_CATEGORY.name ||
                          r._CURRENT_CATEGORY.path)) ||
                      r._CURRENT_CATEGORY ||
                      "") && (n += "-"),
                    (n += "All")),
                gDesigner.stats("librarypanel_change_category", n),
                r._loadAssets(e, r._CURRENT_CATEGORY, r._updateUI.bind(r));
            });
          "element.image" === t.path && c.addClass("full-width");
          var d = e.parent();
          d.find(".selector-container").remove();
          var u = d.find(".indicator");
          $("<div/>").addClass("selector-container").append(c).insertAfter(u),
            $("<option/>")
              .text(
                a.GLocale.get(new a.GLocaleKey("GCommonNames", "element.all"))
              )
              .appendTo(c);
          for (var p = 0; p < s.length; ++p) {
            var g =
              "element.child.name." +
              s[p].name.toLowerCase().trim().replace(/\s+/g, "-");
            $("<option/>")
              .text(
                a.GLocale.get(new a.GLocaleKey("GCommonNames", g), s[p].name)
              )
              .data("category", s[p])
              .appendTo(c);
          }
        }
        !(function (t) {
          var n = [];
          i || e.find(".asset").remove();
          for (var o = 0; o < t.length; ++o) {
            let i = t[o],
              l = i.path && i.path.startsWith("element.image");
            var a = r._getPreviewURI(i);
            if (l) n.push(i);
            else {
              var s = $("<div/>")
                  .addClass("asset-container")
                  .attr("data-title", i.name || ""),
                c = $("<img/>")
                  .on("dragstart", function () {
                    return !1;
                  })
                  .attr("draggable", !1)
                  .attr("src", a)
                  .on("mousedown", function (e) {
                    r._onItemDragStartHandler(i, e);
                  })
                  .addClass("asset");
              s.append(c), e.append(s);
            }
          }
          if (n) {
            var d = l.length ? l : e;
            r._initMasonryLayoutColumns(d, n, i);
          }
        })(n);
      }
      _initMasonryLayoutColumns(e, t, n, o) {
        if (
          (o && e && (t = e.find(".column").children()).unwrap(),
          0 === t.length)
        )
          return;
        this._wrapperWidth = e.css("width")
          ? parseInt(e.css("width").split("px")[0])
          : 250;
        var i,
          a = [],
          r = 2,
          l = null;
        if (
          ((r = Math.max(Math.ceil(this._wrapperWidth / 200), r)),
          (i = this._wrapperWidth / r - 4 * (r - 1)),
          (l =
            r > 2 ? (i / this._wrapperWidth) * 100 + "%" : "calc(50% - 4px)"),
          n)
        )
          a = e.find(".column").toArray();
        else
          for (var c = 0; c < r; c++) {
            var d = $("<div/>").addClass("column").css("width", l);
            c > 0 && d.css("margin-left", "4px"), a.push(d);
          }
        const u = a.map(this._getChildrenHeight.bind(this)),
          p = [];
        for (var g = 0; g < t.length; g++) {
          var h;
          if (o) h = t[g];
          else {
            let e = t[g];
            var f = this._getPreviewURI(e),
              m = $("<img/>")
                .addClass("asset")
                .attr("draggable", !1)
                .attr("src", f)
                .on("dragstart", function () {
                  return !1;
                });
            gDesigner.isTouchDevice()
              ? m.on("click", () => {
                  this._addAsset(e);
                })
              : m.on("mousedown", (t) => {
                  this._onItemDragStartHandler(e, t);
                }),
              (h = $("<div/>")
                .addClass("asset-container image-asset")
                .css("margin-bottom", "4px")
                .data("asset", e)
                .append(
                  $("<span/>")
                    .text(e.user.name)
                    .attr("draggable", !1)
                    .on("click", function (t) {
                      t.preventDefault();
                      var n = new URL(e.user.profile);
                      n.searchParams.append(
                        "utm_source",
                        encodeURIComponent(s.DESIGNER.TITLE)
                      ),
                        n.searchParams.append("utm_medium", "referral"),
                        gContainer.openExternalLink(t, n);
                    })
                )).append(m);
          }
          const e = this._getSmallestColumnIndex(u),
            n = $(h).data("asset"),
            i = this._getThumbnailSize(n).getHeight();
          u[e] = (u[e] || 0) + i;
          const a = p[e] || [];
          a.push(h), (p[e] = a);
        }
        a.forEach((e, t) => {
          $(e).append(p[t]);
        }),
          n || e.append(a);
      }
      _addAsset(e, t) {
        var n = this;
        !(async function () {
          if (e.content)
            t && (t.center = !0),
              gDesigner
                .getActiveDocument()
                .placeOrImport(
                  new Blob([e.content], { type: e.type || "image/svg+xml" }),
                  t,
                  !1,
                  !0
                );
          else if (e.path.startsWith("element.ui."))
            try {
              var o = await fetch(e.url).then((e) => {
                  if (!e.ok) throw new Error();
                  return e.text();
                }),
                l = $.parseXML(o);
              l &&
                "svg" === l.documentElement.nodeName &&
                gDesigner
                  .getActiveDocument()
                  .placeOrImport(
                    new Blob([o], { type: "image/svg+xml" }),
                    t,
                    !1,
                    !0
                  );
            } catch (e) {}
          else if (e.path.startsWith("element.image.")) {
            var u = e.id;
            try {
              var p = r.GPlatform.modifiers.optionKey,
                g = await s.gApi.getUnsplashPhotoUrl({
                  id: u,
                  size: "regular",
                }),
                h = await fetch(g).then((e) => {
                  if (!e.ok) throw new Error();
                  return e.blob();
                });
              i.GBitmapImport.import(h, (e, o, i, r) => {
                if (e)
                  new c(
                    a.GLocale.get(
                      new a.GLocaleKey("GDocument", "text.image-too-big")
                    )
                  ).open();
                else {
                  var s = gDesigner.getActiveDocument(),
                    l = s.getScene(),
                    u = s.getEditor(),
                    g = l.getActivePage(),
                    h = u.hasSelection() && u.getSelection()[0],
                    f = a.GLocale.get(
                      new a.GLocaleKey("GImage", "name.unsplash")
                    ),
                    m = a.GLocale.get(
                      new a.GLocaleKey("GEditor", "action.insert-image")
                    );
                  u.beginTransaction();
                  try {
                    if (!h || h instanceof a.GImage) {
                      let e = new a.GImage();
                      e.setProperties(
                        ["name", "iw", "ih", "url"],
                        [f, i, r, o]
                      ),
                        n._transformNode(e, t),
                        g.appendChild(e),
                        gDesigner.stats("librarypanel_download_image");
                    } else if (p) {
                      var y = u.getSelection()[0].getTransform(),
                        v = y && y.getTranslation();
                      let e = new a.GImage();
                      e.setProperties(
                        ["name", "iw", "ih", "url"],
                        [f, i, r, o]
                      ),
                        !t && v && (t = { x: v.getX(), y: v.getY() }),
                        n._transformNode(e, t),
                        g.appendChild(e),
                        u.updateSelection(!0, [e]),
                        gDesigner.executeAction(d.ID, void 0, void 0, !0),
                        gDesigner.stats("librarypanel_download_image", "clip");
                    } else {
                      var _ = u.getSelection()[0].getPaintLayers();
                      if (_) {
                        var b = new a.GTexturePattern(o);
                        b.setSizeMode(a.GTexturePattern.SizeMode.Cover),
                          b.setScene(l);
                        var w = new a.GStylable.FillPaintLayer(b);
                        _.appendChild(w);
                      }
                      (m = a.GLocale.get(
                        new a.GLocaleKey(
                          "GFillPaintLayerProperties",
                          "action.change-properties"
                        )
                      )),
                        gDesigner.stats("librarypanel_download_image", "fill");
                    }
                  } finally {
                    u.commitTransaction(m);
                  }
                }
              });
            } catch (e) {}
          } else {
            var f = e.url,
              m = gDesigner.getActiveDocument(),
              y = m.getEditor(),
              v = m.getScene().getActivePage(),
              _ = null,
              b = null,
              w = v.getGeometryBBox(),
              C = w && v.isFixedSized() ? w.getWidth() : 800,
              x = w && v.isFixedSized() ? w.getHeight() : 800;
            if (e.path.startsWith("element.line.tile")) b = (_ = 0.4 * C) / 10;
            else {
              (_ = e.width), (b = e.height);
              var S = _ / b;
              if (
                ((_ = C / 3) > 300 && (_ = 300),
                (b = _ / S),
                (_ = Math.round(_)),
                (b = Math.round(b)) > x)
              ) {
                var E = b;
                (b = x / 3) > 300 && (b = 300),
                  (_ = (_ / E) * b),
                  (_ = Math.round(_)),
                  (b = Math.round(b));
              }
            }
            var A = new XMLHttpRequest();
            A.open("GET", f),
              (A.onload = () => {
                i.GSVGImport.import(
                  A.responseText,
                  { baseWidth: _, baseHeight: b, forceBaseSize: !0 },
                  gDesigner
                    .getActiveDocument()
                    .getScene()
                    ._workspace.getFontManager(),
                  (o, i) => {
                    if (i) {
                      y.beginTransaction();
                      try {
                        if (e.path.startsWith("element.line.tile")) {
                          var r,
                            s,
                            l = new a.GTexturePattern(
                              i,
                              a.GTexturePattern.RepeatMode.Horizontal
                            );
                          l.setPosition(a.GTexturePattern.PositionMode.Center),
                            t
                              ? ((r = t.x - _ / 2), (s = t.y - b / 2))
                              : ((r = 0.3 * C), (s = (x - b) / 2));
                          var c = new a.GRectangle();
                          c.setProperty(
                            "trf",
                            new a.GTransform(
                              _ / 2,
                              0,
                              0,
                              b / 2,
                              r + _ / 2,
                              s + b / 2
                            )
                          ),
                            c.setProperty("isLine", !0, !0, !1),
                            v.appendChild(c),
                            c
                              .getPaintLayers()
                              .insertChild(new a.GStylable.FillPaintLayer(l)),
                            gDesigner
                              .getActiveDocument()
                              .getEditor()
                              .updateSelection(!1, [c]);
                        } else
                          n._transformNode(i, t),
                            m.insertElement(i, !t, !0, !1);
                      } finally {
                        y.commitTransaction("Add Element");
                      }
                    }
                  }
                );
              }),
              A.send();
          }
        })();
      }
      _transformNode(e, t) {
        if (t && e.hasMixin(a.GElement.Transform)) {
          var n = e.getGeometryBBox(),
            o = n && n.getX() ? n.getX() : 0,
            i = n && n.getY() ? n.getY() : 0;
          n && ((o += n.getWidth() / 2), (i += n.getHeight() / 2)),
            e.transform(new a.GTransform(1, 0, 0, 1, t.x - o, t.y - i), !0);
        }
      }
      _createScrollEvent() {
        $(".library-container").unbind("scroll"),
          $($(".library-container")).scroll(
            function (e) {
              var t = $(e.currentTarget);
              t.scrollTop() > 50
                ? 0 === $(t).find(".library-scroll-top").length &&
                  $("<div/>")
                    .addClass("library-scroll-top")
                    .append(
                      $("<div/>")
                        .addClass("container")
                        .append(
                          $("<span/>").text(
                            a.GLocale.get(
                              new a.GLocaleKey(
                                "GCommonNames",
                                "text.back-to-top"
                              )
                            )
                          )
                        )
                        .append(
                          $("<span/>").addClass("gravit-icon-back-to-top")
                        )
                    )
                    .on("click", function () {
                      gDesigner.stats("librarypanel_click_backtotop"),
                        $(".library-container").animate(
                          { scrollTop: 0 },
                          "slow"
                        );
                    })
                    .appendTo(t)
                : $(t).find(".library-scroll-top").remove();
            }.bind(this)
          );
      }
      _createSearch(e) {
        var t = $("<div/>"),
          n = $("<div/>"),
          o = this,
          i = function (e) {
            o._libraryPanel
              .find(".category-row")
              .find(".category")
              .removeClass("active"),
              o._libraryPanel.find(".assets").css("display", "none"),
              (o._CURRENT_SKIP_COUNT = 0),
              (o._IMAGE_PAGE_COUNT = 1),
              (o._CURRENT_CATEGORY = e),
              (o._CURRENT_ROOT_CATEGORY = null),
              t.find("span").toggleClass("gravit-icon-search", !e || !e.trim()),
              t
                .find("span")
                .toggleClass("gravit-icon-close", !!e && !!e.trim());
            var i = n.find(".assets-wrapper").first();
            i.empty(),
              i.append($("<div></div>").addClass("assets-wrapper images")),
              e &&
                e.trim() &&
                (n.css("display", "block"),
                o._createScrollEvent(null, n, !0),
                o._loadAssets(i, e, o._updateUI.bind(o), !0));
          };
        t
          .addClass("library-search")
          .append(
            $("<input/>")
              .attr("type", "text")
              .addClass("g-input")
              .attr(
                "placeholder",
                a.GLocale.get(
                  new a.GLocaleKey("GCommonNames", "element.search")
                ) + "..."
              )
              .on("keypress", function (e) {
                13 === e.keyCode && i($(this).val());
              })
          )
          .append(
            $("<span/>")
              .addClass("gravit-icon-search")
              .on("click", function () {
                var e = $(this);
                gDesigner.stats(
                  "librarypanel_click_search",
                  e.prev("input").val()
                ),
                  $(n).is(":visible")
                    ? (n.find(".assets-wrapper").empty(),
                      n.css("display", "none"),
                      e.prev("input").val(""),
                      e.removeClass("gravit-icon-close"),
                      e.addClass("gravit-icon-search"))
                    : i(e.prev("input").val());
              })
          )
          .appendTo(e),
          n
            .addClass("assets")
            .css("display", "none")
            .append(
              $("<div></div>")
                .addClass("assets-content")
                .append([
                  $("<div/>").addClass("indicator"),
                  $("<div/>")
                    .addClass("assets-wrapper")
                    .append($("<div/>").addClass("assets-wrapper images")),
                ])
            )
            .append(this._loadMoreButton(n, !0))
            .appendTo(e);
      }
      _loadMoreButton(e, t) {
        return $("<div/>")
          .addClass("button-wrapper")
          .addClass("hidden")
          .append(
            $("<button/>")
              .addClass("load-more")
              .text(
                a.GLocale.get(
                  new a.GLocaleKey("GCommonNames", "text.library-load-more")
                )
              )
              .on("click", () => {
                this._loadAssets(
                  e.find(".assets-wrapper").first(),
                  this._CURRENT_CATEGORY,
                  this._updateUI.bind(this),
                  t,
                  !0
                ),
                  this._toggleShowMoreButton(!0, !0);
              })
          );
      }
      _initElements(e) {
        for (var t = this, n = 0; n < g.length; ++n) {
          let r = g[n];
          if (n > 0 && n % 3 == 0) {
            let t = $("<div/>")
              .addClass("assets")
              .css("display", "none")
              .append(
                $("<div/>")
                  .addClass("assets-content")
                  .append([
                    $("<div/>").addClass("indicator"),
                    $("<div/>").addClass("assets-wrapper"),
                  ])
              )
              .appendTo(e);
            t.append(this._loadMoreButton(t, !1));
          }
          var o = this._libraryPanel.find(".category-row:last-child");
          (0 !== o.length && 3 !== o.children().length) ||
            (o = $("<div/>").addClass("category-row")).appendTo(e);
          let s = $("<div/>")
            .addClass("category")
            .on("click", function () {
              var e = r.name || r.path || r || "";
              e && (e += "-"),
                (e += "All"),
                gDesigner.stats("librarypanel_search_category", e);
              var n = $(this),
                o = n.closest(".category-row"),
                i = o.children().index(this),
                a = o.next(".assets"),
                l = n.hasClass("category") && n.hasClass("active");
              o
                .closest(".g-library-panel")
                .find(".category")
                .removeClass("active"),
                n.addClass("active");
              var c = o
                .closest(".g-library-panel")
                .find(".assets")
                .not(o.next(".assets"));
              c.removeClass("first second third"),
                $(".library-search")
                  .find("span")
                  .removeClass("gravit-icon-close"),
                $(".library-search")
                  .find("span")
                  .addClass("gravit-icon-search"),
                c.css("display", "none");
              var d = a.find(".assets-wrapper");
              "auto" !== d.css("height") && d.css("height", "auto"),
                a.find(".selector-container").remove(),
                d.empty(),
                c.find(".assets-wrapper").empty();
              var u = function (e) {
                let t = a.hasClass(e);
                a.removeClass("first second third"),
                  t
                    ? (a.css("display", "none"), n.removeClass("active"))
                    : (a.addClass(e),
                      a.css("display", ""),
                      n.addClass("active"));
              };
              u(0 === i ? "first" : 1 === i ? "second" : "third");
              var p = a.find(".assets-content");
              (d = a.find(".assets-wrapper")),
                p.removeClass(),
                p.addClass("assets-content"),
                p.addClass("asset-" + r.path.slice(8).replace(/\./g, "-")),
                t._createScrollEvent(s, a),
                (t._CURRENT_SKIP_COUNT = 0),
                (t._IMAGE_PAGE_COUNT = 1),
                (t._CURRENT_CATEGORY = r),
                (t._CURRENT_ROOT_CATEGORY = r),
                l || t._loadAssets(d, r, t._updateUI);
            })
            .appendTo(o);
          var i = $("<div/>").addClass("content").appendTo(s);
          $("<img/>").addClass("icon").attr("src", r.url).appendTo(i),
            $("<span/>")
              .addClass("title")
              .text(
                a.GLocale.get(
                  new a.GLocaleKey("GCommonNames", r.path.replace(/\.$/, "")),
                  r.name
                )
              )
              .appendTo(i);
        }
        let r = $("<div/>")
          .addClass("assets")
          .css("display", "none")
          .append(
            $("<div/>")
              .addClass("assets-content")
              .append([
                $("<div/>").addClass("indicator"),
                $("<div/>").addClass("assets-wrapper"),
              ])
          )
          .appendTo(e);
        r.append(this._loadMoreButton(r, !1));
      }
      _loadAssets(e, t, n, o, i) {
        this._toggleShowMoreButton(!1, !1),
          this._toggleLoading(!0),
          this._doLoadAssets(e, t, n, o, i);
      }
      async _doLoadAssets(e, t, n, o, i) {
        let a = [],
          r = 0,
          c = 0;
        try {
          if (o) {
            let e = [];
            if (l.default.isUnsplashIntegrationEnabled()) {
              if (!this._IMAGE_ASSET_DRAINED)
                try {
                  e = await s.gApi.searchUnsplashPhotos({
                    query: t,
                    page: this._IMAGE_PAGE_COUNT,
                  });
                } catch (e) {
                  console.warn("Unsplash search failed", e);
                }
              (c = (e || []).length), c || (this._IMAGE_ASSET_DRAINED = !0);
            }
            (a = []),
              -1 !== this._CURRENT_SKIP_COUNT &&
                (a = await s.gApi.listMarket({
                  q: t,
                  path: "element.",
                  limit: "90",
                  skip: this._CURRENT_SKIP_COUNT + "",
                  sort: "name",
                })),
              (r = (a || []).length),
              (a = a.concat(e));
          } else if (t.path && t.path.startsWith("element.image"))
            l.default.isUnsplashIntegrationEnabled() &&
              ((a = t.tag
                ? await s.gApi.searchUnsplashPhotos({
                    query: t.tag,
                    page: this._IMAGE_PAGE_COUNT,
                  })
                : await s.gApi.getUnsplashPhotos({
                    page: this._IMAGE_PAGE_COUNT,
                  })),
              (c = (a || []).length));
          else {
            var d = t.path;
            (a = await s.gApi.listMarket({
              path: "element.line" === d ? "element.line.tile" : d,
              tag: t.tag,
              limit: "90",
              skip: this._CURRENT_SKIP_COUNT + "",
              sort: "name",
            })),
              (r = (a || []).length);
          }
          r < 90 && 0 === c
            ? this._toggleShowMoreButton(!1, !1)
            : this._toggleShowMoreButton(!0, !1),
            a.length < 90
              ? ((this._CURRENT_SKIP_COUNT = -1), this._IMAGE_PAGE_COUNT++)
              : ((this._CURRENT_SKIP_COUNT += 90), this._IMAGE_PAGE_COUNT++);
        } catch (e) {}
        this._toggleLoading(!1), n.call(this, e, t, a, o, i);
      }
      _toggleLoading(e) {
        e
          ? this._libraryPanel.find(".assets").addClass("loading")
          : this._libraryPanel.find(".assets").removeClass("loading");
      }
      _toggleShowMoreButton(e, t) {
        let n = this._libraryPanel.find(".assets").find(".button-wrapper");
        n.find(".load-more")[t ? "addClass" : "removeClass"]("hidden"),
          n[t ? "addClass" : "removeClass"]("loading"),
          n[e ? "removeClass" : "addClass"]("hidden");
      }
      _getPreviewURI(e) {
        return e.content && !e.url_t
          ? "data:"
              .concat(e.type || "image/svg+xml", ";base64,")
              .concat(p(e.content))
          : e.url_t || e.url || e.image.thumb;
      }
      _onItemDragStartHandler(e, t, n) {
        var o;
        (this._clickCheckTime = Date.now()),
          (o = n
            ? n.get(0).getBoundingClientRect()
            : t.target.getBoundingClientRect());
        var i = e.width || o.width || 50,
          a = e.height || o.height || 50,
          r = gDesigner.getActiveDocument().getScene().getActivePage();
        if (e.path.startsWith("element.line.tile"))
          a =
            (i =
              r.getGeometryBBox() && r.isFixedSized()
                ? 0.4 * r.getGeometryBBox().getWidth()
                : 320) / 10;
        else {
          var s = r.getGeometryBBox(),
            l = s && r.isFixedSized() ? s.getWidth() : 800,
            c = s && r.isFixedSized() ? s.getHeight() : 800;
          if (
            !e.path.startsWith("element.ui") &&
            !e.path.startsWith("element.icons")
          ) {
            var d = i / a;
            if (
              ((i = l / 3) > 300 && (i = 300),
              (a = i / d),
              (i = Math.round(i)),
              (a = Math.round(a)) > c)
            ) {
              var u = a;
              (a = c / 3) > 300 && (a = 300),
                (i = (i / e.height) * u),
                (i = Math.round(i)),
                (a = Math.round(a));
            }
          }
          (a *= gDesigner.getWindows().getActiveWindow().getView().getZoom()),
            (i *= gDesigner.getWindows().getActiveWindow().getView().getZoom());
        }
        if (!this._dragging) {
          var p = o.left + o.width / 2,
            g = o.top + o.height / 2;
          (this._dragOffset = { x: p - t.clientX, y: g - t.clientY }),
            (this._dragging = !0),
            (this._currentElement = t.target),
            (this._currentItem = e),
            (this._previewSize = { w: i, h: a }),
            e.path.startsWith("element.line.tile")
              ? (this.dragPreview = $("<div/>")
                  .css("background", 'url("' + e.url + '")')
                  .css("background-repeat", "repeat-x")
                  .css("background-position", Math.round(a / 2) + "px 0px")
                  .css("position", "absolute")
                  .css("height", a / 2 + "px")
                  .css("width", i / 2 + "px")
                  .css("display", "none")
                  .appendTo("body"))
              : (e.content && !e.url
                  ? (this.dragPreview = $(e.content))
                  : (this.dragPreview = $("<img/>").attr(
                      "src",
                      e.url || (e.image && e.image.thumb)
                    )),
                this.dragPreview
                  .css("position", "absolute")
                  .css("height", a + "px")
                  .css("width", i + "px")
                  .css("display", "none")
                  .on("dragstart", function () {
                    return !1;
                  })
                  .attr("draggable", !1)
                  .appendTo("body"));
          var h = t.clientX,
            f = t.clientY;
          $(this.dragPreview).css("left", h + "px"),
            $(this.dragPreview).css("top", f + "px"),
            (this._itemDragListener = this._onItemDrag.bind(this)),
            (this._itemDragEndListener = this._onItemDragEndHandler.bind(this)),
            document.addEventListener("mousemove", this._itemDragListener),
            document.addEventListener("touchmove", this._itemDragListener),
            document.addEventListener("mouseup", this._itemDragEndListener),
            document.addEventListener("touchend", this._itemDragEndListener);
        }
      }
      _onItemDragEndHandler(e) {
        if (
          ($(this.dragPreview).remove(),
          Date.now() - this._clickCheckTime <= 200 || !this._dragMoved)
        )
          return (
            (this._dragMoved = !1),
            document.removeEventListener("mousemove", this._itemDragListener),
            document.removeEventListener("touchmove", this._itemDragListener),
            document.removeEventListener("mouseup", this._itemDragEndListener),
            document.removeEventListener("touchend", this._itemDragEndListener),
            (this._dragging = !1),
            (this._currentElement.style.visibility = "visible"),
            void this._addAsset(this._currentItem)
          );
        if (((this._dragMoved = !1), this._dragging)) {
          var t = gDesigner.getActiveDocument();
          document.removeEventListener("mousemove", this._itemDragListener),
            document.removeEventListener("touchmove", this._itemDragListener),
            document.removeEventListener("mouseup", this._itemDragEndListener),
            document.removeEventListener("touchend", this._itemDragEndListener);
          var n = e.clientX,
            o = e.clientY;
          if (gDesigner.positionIsOnCanvas(n, o)) {
            var i = t.getActiveWindow().getView(),
              a = {};
            Object.assign(a, e),
              (a.clientX = n),
              (a.clientY = o),
              (a.offsetX =
                e.offsetX + (this._dragOffset && this._dragOffset.x)),
              (a.offsetY =
                e.offsetY + (this._dragOffset && this._dragOffset.y)),
              (a.pageX = e.pageX + (this._dragOffset && this._dragOffset.x)),
              (a.pageY = e.pageY + (this._dragOffset && this._dragOffset.y));
            var r = i._convertClientPositionFromMousePosition(a),
              s = i.getViewTransform(t.scene).mapPoint(r);
            (r = { x: s._x, y: s._y }), this._addAsset(this._currentItem, r);
          }
          (this._dragging = !1),
            (this._currentElement.style.visibility = "visible");
        }
      }
      _onItemDrag(e) {
        (this._dragMoved = !0),
          (this._currentElement.style.visibility = "hidden");
        var t = e.clientX + (this._dragOffset ? this._dragOffset.x : 0),
          n = e.clientY + (this._dragOffset ? this._dragOffset.y : 0);
        (t -= this._previewSize.w / 2),
          (n -= this._previewSize.h / 2),
          $(this.dragPreview).css("left", t + "px"),
          $(this.dragPreview).css("top", n + "px"),
          $(this.dragPreview).css("display", "");
      }
      resize() {
        this._debouncedResizeHandler();
      }
      _getSmallestColumnIndex(e) {
        return e.indexOf(Math.min.apply(null, e)) || 0;
      }
      _getThumbnailSize(e) {
        const t = 200 / e.image.width,
          n = parseInt(e.image.height * t) + 4;
        return new a.GRect(0, 0, 200, n);
      }
      _getChildrenHeight(e) {
        return $(e)
          .children()
          .toArray()
          .reduce((e, t) => e + $(t).height(), 0);
      }
    };
  }