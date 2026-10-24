/**
 * Webpack Module #1558
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    n(168),
      n(57),
      n(8),
      n(196),
      n(4),
      n(41),
      n(13),
      n(32),
      n(38),
      n(169),
      n(1175),
      n(33);
    var o = n(1),
      i = n(10),
      a = n(119),
      r = n(163);
    const { debounce: s } = n(40),
      l = i.FILE_FORMATS.find((e) => e.default);
    var c = {},
      d = null;
    const u = i.CATEGORIES.filter((e) => e.active);
    class p {
      constructor(e) {
        (this._templatesPanel = $("<div/>")
          .addClass("g-templates-panel")
          .appendTo($("body"))),
          this._templatesPanel.gDialog({
            closeTimeout: 0,
            releaseOnClose: !0,
            className: "g-templates-panel-container",
            alwaysCloseable: !0,
          }),
          this._templatesPanel.gDialog("open", !0),
          (d = e),
          (this._breadcrumbs = [
            {
              key: p.DefaultBreadcrumbs.Welcome,
              name: o.GLocale.getValue("GCloudTemplates", "text.welcome"),
              click: (e) => {
                e.stopPropagation(), this._templatesPanel.gDialog("close");
              },
              tooltip: o.GLocale.getValue("GFilesPanel", "action.close-window"),
            },
          ]),
          this._initTopBar(this._templatesPanel),
          this._loadHeader(),
          (this._contentPanel = $("<div/>")
            .addClass("templates")
            .appendTo(this._templatesPanel)),
          this._initCategories(),
          this._initResizeHandler();
      }
      _initResizeHandler() {
        (this._debouncedResizeHandler = s(
          function () {
            this._initMasonryLayoutColumns(null, null, null, !0);
          }.bind(this),
          200
        )),
          $(window).resize(
            function () {
              this._debouncedResizeHandler();
            }.bind(this)
          );
      }
      _openPreset(e) {
        return a
          .loadDesignData(e.id)
          .then((t) => {
            var n = new r();
            return (
              gDesigner.addDocument(n),
              n.loadFromData(t.data),
              i.gApi.usage(e.id).catch((e) => {
                console.error("gApi.usage error", e);
              })
            );
          })
          .catch((e) => {
            e && console.log(e);
          })
          .finally(() => {
            this._templatesPanel.gDialog("close");
          });
      }
      _getActivePresetCategory() {
        if (this._currentSubcategory || this._currentCategory)
          return this._currentSubcategory
            ? this._currentSubcategory
            : this._currentCategory;
      }
      _initLoadPage(e, t) {
        (c = {}),
          t === p.AssetType.Category
            ? ((this._currentCategory = e),
              this._breadcrumbs.push({
                key: p.DefaultBreadcrumbs.Templates,
                name: o.GLocale.getValue("GCloudTemplates", "text.templates"),
                click: (t) => {
                  t.stopPropagation(),
                    gDesigner.stats(
                      "cloudtemplates_click_backbutton",
                      e ? e.name : ""
                    ),
                    this._initCategories();
                },
              }))
            : t === p.AssetType.Subcategory &&
              ((this._currentSubcategory = e),
              this._breadcrumbs.push({
                key: this._currentCategory.key,
                name: o.GLocale.getValue(
                  "GCommonNames",
                  this._currentCategory.key
                ),
                click: (t) => {
                  t.stopPropagation(),
                    gDesigner.stats(
                      "cloudtemplates_click_backbutton",
                      e ? e.name : ""
                    ),
                    (this._breadcrumbs = this._breadcrumbs.filter(
                      (e) => e.key !== this._currentCategory.key
                    )),
                    this._initSubcategories();
                },
              })),
          this._loadBreadcrumbs(),
          this._loadHeader(),
          t === p.AssetType.Category && this._currentCategory.subcategories
            ? this._initSubcategories()
            : ((this._presetsCount = 0),
              (this._presetsCurrentSkip = 0),
              (this._presetsLoadMore = !0),
              this._loadPresets(!1));
      }
      _loadPresets(e) {
        this._toggleLoadMoreButton(!1),
          this._toggleLoading(!0),
          this._doLoadPresets(e);
      }
      async _doLoadPresets(e) {
        var t = this;
        this._presetsLoadMore &&
          (async function (n) {
            try {
              var o = await i.gApi.listMarketV2({
                path: t._getActivePresetCategory().path,
                type: l.type,
                sort: "-usages",
                limit: i.PRESET_LIMIT,
                skip: t._presetsCurrentSkip,
              });
              c[t._getActivePresetCategory().key] ||
                (c[t._getActivePresetCategory().key] = []),
                (c[t._getActivePresetCategory().key] = c[
                  t._getActivePresetCategory().key
                ].concat(o.data)),
                o.count && (t._presetsCount = o.count),
                c[t._getActivePresetCategory().key].length == t._presetsCount
                  ? (t._presetsLoadMore = !1)
                  : (t._presetsCurrentSkip += i.PRESET_LIMIT),
                n(o.data, e);
            } catch (e) {
              n(c[t._getActivePresetCategory().key], !1), console.error(e);
            }
          })(function (e, n) {
            n || t._contentPanel.empty(),
              t._initMasonryLayoutColumns(e, p.AssetType.Preset, n),
              t._loadMoreButton(),
              t._toggleLoading(!1);
          });
      }
      _loadMoreButton() {
        this._contentPanel.find(".button-wrapper").remove(),
          this._presetsLoadMore &&
            (this._doLoadMoreButton(), this._toggleLoadMoreButton(!0));
      }
      _doLoadMoreButton() {
        this._contentPanel.append(
          $("<div/>")
            .addClass("button-wrapper")
            .addClass("hidden")
            .append(
              $("<div/>")
                .addClass("g-button")
                .addClass("cloud-button")
                .addClass("load-more")
                .on("click", () => {
                  this._loadPresets(!0);
                })
                .append(
                  $("<span/>")
                    .addClass("label")
                    .text(
                      o.GLocale.get(
                        new o.GLocaleKey(
                          "GCommonNames",
                          "text.library-load-more"
                        )
                      )
                    )
                )
            )
        );
      }
      _initSubcategories() {
        this._contentPanel.empty(),
          (this._currentSubcategory = null),
          this._loadHeader(),
          this._loadBreadcrumbs(),
          this._initMasonryLayoutColumns(
            this._currentCategory.subcategories,
            p.AssetType.Subcategory
          );
      }
      _initCategories() {
        this._contentPanel.empty(),
          (this._currentCategory = null),
          (this._currentSubcategory = null),
          this._loadHeader(),
          this._loadBreadcrumbs(!0),
          this._initMasonryLayoutColumns(u, p.AssetType.Category);
      }
      _initMasonryLayoutColumns(e, t, n, a) {
        var r = this._contentPanel.find(".assets-wrapper");
        if (
          (0 === r.length &&
            (r = $("<div/>").addClass("assets-wrapper")).appendTo(
              this._contentPanel
            ),
          a && (e = r.find(".column").children()).unwrap(),
          0 === e.length)
        )
          return;
        this._wrapperWidth = r.css("width")
          ? parseInt(r.css("width").split("px")[0])
          : 235;
        var s,
          l = [],
          c = 1,
          u = null;
        if (
          ((c = Math.max(Math.ceil(this._wrapperWidth / 235), c)),
          (s = this._wrapperWidth / c - (32 / c) * (c - 1)),
          (u =
            1 == c || c > 2
              ? (s / this._wrapperWidth) * 100 + "%"
              : "calc(50% - 32px)"),
          n)
        )
          l = r.find(".column").toArray();
        else
          for (var g = 0; g < c; g++) {
            var h = $("<div/>").addClass("column").css("width", u);
            g > 0 && h.css({ "margin-left": "32px" }), l.push(h);
          }
        const f = l.map(this._getChildrenHeight.bind(this)),
          m = [];
        for (var y = 0; y < e.length; y++) {
          var v;
          if (a) v = e[y];
          else if (t === p.AssetType.Preset) {
            let t = e[y];
            var _ = $("<img/>")
              .addClass("asset")
              .attr("src", t.url_t)
              .css("width", t.width || "235px")
              .on(
                "click",
                function () {
                  d && d(),
                    gDesigner.stats(
                      "cloudtemplates_add_" +
                        (this._getActivePresetCategory()
                          ? this._getActivePresetCategory().name
                          : "default"),
                      t.name
                    ),
                    gDesigner
                      .getAmplitudeHelper()
                      .logEvent(i.AmplitudeData.Events.DOCUMENT_CREATED, {
                        DOCUMENT_CATEGORY: this._getActivePresetCategory().name,
                        DOCUMENT_TYPE: t.name,
                        DOCUMENT_TEMPLATE_ID: t.id,
                      }),
                    i.IS_TRUNK && console.log("Template ID: ", t.id),
                    this._openPreset(t);
                }.bind(this)
              );
            (v = $("<div/>")
              .addClass("asset-container preset-container")
              .css("margin-bottom", "32px")
              .data("asset", t)).append(_);
          } else {
            let n = e[y];
            _ = $("<div/>")
              .addClass("asset")
              .css("width", n.width + "px")
              .append(
                $("<img/>")
                  .attr("src", n.url)
                  .on("click", () => {
                    gDesigner.stats("cloudtemplates_load_template", n.name),
                      this._initLoadPage(n, t);
                  })
              )
              .append(
                $("<div/>")
                  .addClass("template-info")
                  .append(
                    $("<div/>")
                      .addClass("template-name")
                      .html(
                        o.GLocale.get(new o.GLocaleKey("GCommonNames", n.key))
                      )
                  )
              );
            (v = $("<div/>")
              .addClass("asset-container category-container")
              .css("margin-bottom", "32px")
              .data("asset", n)).append(_);
          }
          const n = this._getSmallestColumnIndex(f),
            r = $(v).data("asset"),
            s = this._getThumbnailSize(r).getHeight();
          f[n] = (f[n] || 0) + s;
          const l = m[n] || [];
          l.push(v), (m[n] = l);
        }
        l.forEach((e, t) => {
          $(e).append(m[t]);
        }),
          n || r.append(l),
          this._removeEmptyColumns();
      }
      _removeEmptyColumns() {
        const e = this._contentPanel
          .find(".assets-wrapper")
          .children(".column");
        e.each((t, n) => {
          n.children.length || e[t].remove();
        });
      }
      _getThumbnailSize(e) {
        const t = 235 / e.width,
          n = parseInt(e.height * t) + 32;
        return new o.GRect(0, 0, 235, n);
      }
      _getChildrenHeight(e) {
        return $(e)
          .children()
          .toArray()
          .reduce((e, t) => e + $(t).height(), 0);
      }
      _getSmallestColumnIndex(e) {
        return e.indexOf(Math.min.apply(null, e)) || 0;
      }
      _loadHeader() {
        const e = this._templatesPanel.find(".header");
        0 === e.length &&
          $("<div/>").addClass("header").appendTo(this._templatesPanel),
          e.empty(),
          e.append(
            $("<span/>")
              .addClass("title")
              .html(
                this._getActivePresetCategory()
                  ? o.GLocale.getValue(
                      "GCommonNames",
                      this._getActivePresetCategory().key
                    )
                  : o.GLocale.getValue("GCloudTemplates", "text.templates")
              )
          );
      }
      _initTopBar(e) {
        (this.topBar = $("<div />")
          .addClass("top-bar")
          .append($("<div />").addClass("breadcrumbs"))
          .append(
            $("<div />")
              .addClass("top-buttons")
              .append(
                $("<div/>")
                  .addClass("g-button")
                  .addClass("cloud-button")
                  .addClass("close-button")
                  .attr(
                    "data-title",
                    o.GLocale.get(
                      new o.GLocaleKey("GFilesPanel", "action.close-window")
                    )
                  )
                  .on("click", (e) => {
                    e.stopPropagation(), this._templatesPanel.gDialog("close");
                  })
                  .append(
                    $("<span/>").addClass("icon").addClass("gravit-icon-close")
                  )
              )
          )
          .appendTo(e)),
          this._loadBreadcrumbs();
      }
      _loadBreadcrumbs(e) {
        e &&
          (this._breadcrumbs = this._breadcrumbs.filter(
            (e) => e.key == p.DefaultBreadcrumbs.Welcome
          ));
        const t = this.topBar.find(".breadcrumbs");
        t.empty(),
          this._breadcrumbs.forEach((e) => {
            var n;
            t.append(
              $("<span/>")
                .addClass("g-breadcrumb")
                .append(
                  $("<span/>")
                    .addClass("breadcrumb-name")
                    .html(e.name)
                    .on("click", e.click)
                    .attr(
                      "data-title",
                      null !== (n = e.tooltip) && void 0 !== n
                        ? n
                        : o.GLocale.getValue(
                            "GFilesPanel",
                            "action.back-tooltip"
                          )
                    )
                )
                .append($("<span/>").addClass("breadcrumb-divider").html("›"))
            );
          });
      }
      _toggleLoading(e) {
        this._templatesPanel.toggleClass("loading", e);
      }
      _toggleLoadMoreButton(e) {
        let t = this._contentPanel.find(".button-wrapper");
        t && t[e ? "removeClass" : "addClass"]("hidden");
      }
    }
    (p.AssetType = {
      Category: "CATEGORY",
      Subcategory: "SUBCATEGORY",
      Preset: "PRESET",
    }),
      (p.DefaultBreadcrumbs = { Welcome: "welcome", Templates: "templates" }),
      (e.exports = p);
  }