/**
 * Webpack Module #1507
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    n(290), n(8), n(20), n(34), n(4), n(13), n(32), n(38), n(33);
    var o = n(357),
      i = n(1),
      a = n(40);
    const {
        gApi: r,
        LINKS: s,
        DESIGNER: { TITLE: l } = {},
        SubscriptionStatus: c,
      } = n(10),
      d = (n(173), n(337)),
      u = ["number", "name", "price", "date"];
    function p(e, t) {
      let n =
        arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : {};
      (this._user = e),
        (this._options = n),
        (this._query = { skip: 0, name: "", issued: "true" }),
        (this._messageHandler = t),
        (this._typing = !1),
        this._init(),
        (this._allowReactivateSubscriptions = !1),
        this._load();
    }
    i.GObject.inherit(p, i.GObject),
      (p.prototype._init = function () {
        this._container = $("<div></div>").addClass("g-purchase-panel");
        let e = void 0;
        const t = () => this._showInfoIfAny(),
          n = (n) => {
            e && clearTimeout(e),
              (e = setTimeout(t, 500)),
              this._search($(n.target).closest("input").val());
          };
        $("<div></div>")
          .addClass("search-panel")
          .append(
            $("<input>")
              .attr("type", "text")
              .attr("data-property", "search")
              .attr(
                "placeholder",
                i.GLocale.get(
                  new i.GLocaleKey("GPurchasePanel", "text.search-label")
                )
              )
              .on("input", (0, a.debounce)((0, a.throttle)(n, 500), 500))
              .on("keyup", (e) => {
                13 === e.which &&
                  (gDesigner.stats("profile-dialog_purchase-panel_search"),
                  n(e));
              })
          )
          .append(
            $("<label></label>")
              .append(
                $("<span></span>").text(
                  i.GLocale.get(
                    new i.GLocaleKey("GPurchasePanel", "text.orderby-label")
                  )
                )
              )
              .append(
                $("<select></select>")
                  .attr("data-property", "orderby")
                  .append(
                    u.map((e) =>
                      $("<option></option>")
                        .attr("value", e)
                        .text(
                          i.GLocale.get(
                            new i.GLocaleKey(
                              "GPurchasePanel",
                              "text.orderby-" + e
                            )
                          )
                        )
                    )
                  )
                  .on("change", (e) => {
                    gDesigner.stats(
                      "profile-dialog_purchase-panel_order-by",
                      e.target.value
                    ),
                      this._orderBy.bind(this);
                  })
              )
              .append(
                $("<span></span>")
                  .data("direction", "")
                  .attr("data-property", "direction")
                  .addClass("gravit-icon-sort-asc")
                  .on("click", (e) => {
                    let t = $(e.target).closest("span"),
                      n = t.data("direction"),
                      o = "asc";
                    "-" === n
                      ? ((n = ""), (o = "asc"))
                      : ((n = "-"), (o = "desc")),
                      t.data("direction", n),
                      t.toggleClass(
                        "gravit-icon-sort-asc gravit-icon-sort-desc"
                      ),
                      gDesigner.stats("profile-dialog_purchase-panel_sort", o),
                      this._orderBy();
                  })
              )
          )
          .appendTo(this._container),
          (this._purchaseList = $("<div></div>")
            .addClass("purchase-list")
            .appendTo(this._container)),
          $("<footer></footer>")
            .append(
              $(
                "<span>"
                  .concat(
                    i.GLocale.get(
                      new i.GLocaleKey(
                        "GPurchasePanel",
                        "text.contact-partner-billing-alternative"
                      )
                    ),
                    "</span>"
                  )
                  .replace(
                    "%partner%",
                    $("<a/>")
                      .addClass("cb-link")
                      .text(
                        i.GLocale.get(
                          new i.GLocaleKey(
                            "GPurchasePanel",
                            "text.contact-partner-cleverbridge"
                          )
                        )
                      )
                      .prop("outerHTML")
                  )
              )
            )
            .appendTo(this._container),
          this._container.find(".cb-link").on("click", (e) => {
            gDesigner.stats("profile-dialog_purchase-panel_cleverbridge-link"),
              gContainer.openExternalLink(e, s.CLEVERBRIDGE_SUPPORT_URL);
          }),
          $(this._purchaseList).scroll((e) => {
            let t = $(e.currentTarget);
            t[0].scrollHeight - t.scrollTop() === t.outerHeight() &&
              $(this._purchaseList).children().length > 0 &&
              this._load();
          });
      }),
      (p.prototype._search = async function (e) {
        this._messageHandler(void 0),
          (this._query.skip = 0),
          (this._query.name = e),
          (this._query.by = this._container
            .find('select[data-property="orderby"] > option:selected')
            .attr("value")),
          (this._query.direction = this._container
            .find('span[data-property="direction"]')
            .data("direction")),
          await this._load(!0);
      }),
      (p.prototype._orderBy = function () {
        this._search(
          this._container.find('input[data-property="search"]').val()
        ),
          this._showInfoIfAny();
      }),
      (p.prototype._showInfoIfAny = function () {
        this._purchaseList[0].hasChildNodes() ||
          this._messageHandler(
            i.GLocale.get(
              new i.GLocaleKey("GPurchasePanel", "text.empty-search")
            ),
            "info"
          );
      }),
      (p.prototype._load = async function (e) {
        if (-1 !== this._query.skip) {
          this._toggleLoading(!0);
          try {
            let t = await r.listPurchasedProducts(this._query),
              n = t.length;
            (this._query.skip =
              n > 0 ? (n < 10 ? -1 : this._query.skip + n) : -1),
              e && this._purchaseList.empty(),
              t.forEach((e) => this._addOrUpdateItem(e));
          } catch (e) {
            this._handleError(e);
          } finally {
            this._toggleLoading(!1);
          }
        }
      }),
      (p.prototype._addOrUpdateItem = function (e, t) {
        const n = e.issued_coupon && e.issued_coupon.lifetime;
        (t =
          t ||
          $("<div></div>")
            .addClass("purchase-item")
            .data("purchase", e)
            .on("click", (e) => {
              this._purchaseList
                .find(".purchase-item.g-active")
                .removeClass("g-active"),
                $(e.target).closest(".purchase-item").addClass("g-active");
            })
            .appendTo(this._purchaseList)).empty();
        let a = !1,
          s = !1;
        this._options &&
          this._options.subscription &&
          e.purchase_id == this._options.subscription.purchase &&
          ((a = !0),
          (s = !!this._options.subscription.reinstate),
          (this._options = null)),
          a && t.addClass("g-selected");
        const u =
          e.name ||
          (n
            ? i.GLocale.get(
                new i.GLocaleKey(
                  "GPurchasePanel",
                  "text.pro-subscription-lifetime"
                )
              ).replace("%app", l)
            : i.GLocale.get(
                new i.GLocaleKey("GPurchasePanel", "text.pro-subscription")
              ).replace("%app", l));
        $("<div></div>")
          .addClass("header")
          .append($("<label></label>").addClass("title").text(u))
          .appendTo(t);
        e.invoice &&
          $("<div></div>")
            .addClass("orderno")
            .append(
              $("<a></a>")
                .attr("href", e.invoice)
                .attr("target", "_blank")
                .append(
                  $("<span></span>").text(
                    ""
                      .concat(
                        i.GLocale.get(
                          new i.GLocaleKey("GPurchasePanel", "text.orderno")
                        ),
                        " "
                      )
                      .concat(e.purchase_id)
                  )
                )
            )
            .appendTo(t),
          o.PURCHASEPANEL.HAS_PRODUCT_DESCRIPTION &&
            $("<div></div>")
              .addClass("description")
              .append($("<label></label>").text(e.description))
              .appendTo(t);
        let p = ""
          .concat(
            i.GLocale.get(new i.GLocaleKey("GPurchasePanel", "text.purchased")),
            " "
          )
          .concat(e.created ? i.GLocale.toLocaleDate(new Date(e.created)) : "");
        !n &&
          e.issued_coupon &&
          e.issued_coupon.expires &&
          (p += ", ".concat(
            i.GLocale.get(
              new i.GLocaleKey("GPurchasePanel", "text.purchased-expires")
            ).replace(
              "%date",
              i.GLocale.toLocaleDate(new Date(e.issued_coupon.expires))
            )
          ));
        let g = $("<span></span>").text(p + ".");
        if (e.subscription && !e.refunded) {
          let a = p;
          g.text(p + "..."),
            r
              .getSubscriptionByPurchase(e.purchase_id, e.provider)
              .then((u) => {
                const p = (e, n, o, a, r) => {
                  let s = $("<div></div>")
                    .addClass("prompt")
                    .append(
                      $("<div></div>")
                        .append($("<span></span>").addClass("title").text(e))
                        .append(
                          $("<div></div>")
                            .append(
                              $("<button></button>")
                                .text(
                                  i.GLocale.get(
                                    new i.GLocaleKey("GLocale", "yes")
                                  )
                                )
                                .on("click", () => a(s))
                            )
                            .append(
                              $("<button></button>")
                                .text(
                                  i.GLocale.get(
                                    new i.GLocaleKey("GLocale", "no")
                                  )
                                )
                                .on("click", () => s.removeClass("show"))
                            )
                        )
                    )
                    .append(
                      $("<div></div>").append(
                        $("<div></div>")
                          .addClass("subtitle")
                          .append($("<span></span>").html(n))
                      )
                    )
                    .insertAfter(t);
                  return (
                    $("<div></div>")
                      .addClass("subscription")
                      .append($("<label></label>").html("&nbsp;"))
                      .append(
                        $("<button></button>")
                          .toggleClass("highlight", !!r)
                          .text(o)
                          .on("click", () => s.addClass("show"))
                      )
                      .appendTo(t),
                    s
                  );
                };
                if (u.status === c.Active)
                  n
                    ? g.text(a + ".")
                    : g.text(
                        ""
                          .concat(a, ", ")
                          .concat(
                            i.GLocale.get(
                              new i.GLocaleKey(
                                "GPurchasePanel",
                                "text.purchased-renews"
                              )
                            ),
                            " "
                          )
                          .concat(
                            i.GLocale.toLocaleDate(new Date(u.endDate)),
                            "."
                          )
                      ),
                    p(
                      i.GLocale.get(
                        new i.GLocaleKey(
                          "GPurchasePanel",
                          "text.prompt-cancel-title"
                        )
                      ),
                      i.GLocale.get(
                        new i.GLocaleKey(
                          "GPurchasePanel",
                          "text.prompt-cancel-info"
                        )
                      )
                        .replace("%app", l)
                        .replace(
                          "%date",
                          i.GLocale.toLocaleDate(new Date(u.endDate))
                        ),
                      i.GLocale.get(new i.GLocaleKey("GLocale", "cancel")),
                      async (n) => {
                        this._toggleLoading(!0);
                        try {
                          await r
                            .deactivateSubscription(u.id, e.provider)
                            .then(() => {
                              gDesigner.stats(
                                "profile-dialog_purchase-panel_cancel-subscription"
                              ),
                                n.remove(),
                                this._addOrUpdateItem(e, t);
                            })
                            .catch((e) => this._handleError(e)),
                            await d.checkLicense();
                        } finally {
                          this._toggleLoading(!1);
                        }
                      }
                    );
                else {
                  if (
                    (g.text(
                      ""
                        .concat(a, ", ")
                        .concat(
                          i.GLocale.get(
                            new i.GLocaleKey(
                              "GPurchasePanel",
                              "text.subscription-ends"
                            )
                          ).replace(
                            "%date",
                            i.GLocale.toLocaleDate(new Date(u.endDate))
                          ),
                          "."
                        )
                    ),
                    !this._allowReactivateSubscriptions)
                  )
                    return;
                  if (u.repurchase) return;
                  let n = p(
                    i.GLocale.get(
                      new i.GLocaleKey(
                        "GPurchasePanel",
                        "text.prompt-activate-title"
                      )
                    ),
                    i.GLocale.get(
                      new i.GLocaleKey(
                        "GPurchasePanel",
                        "text.prompt-activate-info"
                      )
                    ).replace(
                      "%date",
                      i.GLocale.toLocaleDate(new Date(u.nextBillingDate))
                    ),
                    i.GLocale.get(
                      new i.GLocaleKey(
                        "GPurchasePanel",
                        "text.prompt-activate-label"
                      )
                    ),
                    async (n) => {
                      this._toggleLoading(!0);
                      try {
                        await r
                          .activateSubscription(u.id, e.provider)
                          .then(() => {
                            gDesigner.stats(
                              "profile-dialog_purchase-panel_activate-subscription"
                            ),
                              n.remove(),
                              this._addOrUpdateItem(e, t);
                          })
                          .catch((e) => this._handleError(e)),
                          await d.checkLicense();
                      } finally {
                        this._toggleLoading(!1);
                      }
                    },
                    o.PURCHASEPANEL.HAS_HIGHLIGHT
                  );
                  s && n.addClass("show");
                }
              })
              .catch(() => g.text(a + "."));
        }
        return (
          $("<div></div>")
            .addClass("purchased")
            .append($("<label></label>").append(g))
            .appendTo(t),
          t
        );
      }),
      (p.prototype._handleError = function (e) {
        let t = i.GLocale.get(
          new i.GLocaleKey("GCommonNames", "text.something-wrong")
        );
        e && e.message
          ? (t = e.message)
          : e && e.errors && (t = e.errors.map((e) => e[1]).join("<br>")),
          this._messageHandler(t);
      }),
      (p.prototype._toggleLoading = function (e) {
        e
          ? this._container.addClass("g-loading")
          : this._container.removeClass("g-loading");
      }),
      (p.prototype.getHTMLElement = function () {
        return this._container;
      }),
      (e.exports = p);
  }