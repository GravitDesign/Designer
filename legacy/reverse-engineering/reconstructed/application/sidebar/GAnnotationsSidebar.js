/**
 * GAnnotationsSidebar
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function GAnnotationsSidebar() {
  // Constructor (reconstructed)
}

// Prototype methods
GAnnotationsSidebar.prototype._updateToolbarButtons = function () {
        this._annotationProperties.forEach((e, t) => {
          const { topArrow: n, properties: o } = e;
          if (o instanceof b) {
            const e = gDesigner.isTouchEnabled()
              ? N.ANNOTATION_PROPERTIES_ARROW_POSITION_TOUCH
              : N.ANNOTATION_PROPERTIES_ARROW_POSITION;
            n.find(".arrow-top").css("right", e[t] + "%");
          }
        });
      }

GAnnotationsSidebar.prototype._updatePropertyPanels = function (e, t) {
        let n =
          !(arguments.length > 2 && undefined !== arguments[2]) || arguments[2];
        if (this._updatingPropertyPanels) return;
        this.updateNotificationOption(), (this._updatingPropertyPanels = true);
        const o = () => {
          let o = false;
          try {
            e && (o = this._updateAnnotationArray());
            var i = this._annotationProperties.concat(this._annotationPanels),
              r = this._annotationToolbar.find(".indicator");
            r.css("visibility", "hidden");
            for (var s = 0; s < i.length; ++s) {
              var l = i[s],
                c = l.properties,
                d = c.isAvailable(this._transformMode);
              if (d)
                if (c instanceof b || c instanceof E)
                  l.panel.show(),
                    (d = l.properties.update(
                      this._document,
                      this._elements,
                      gDesigner.getToolManager().getActiveTool()
                    )) || l.panel.hide();
                else {
                  var u = c.getPage().getAnnotations().getChildren();
                  (d = l.properties.update(this._document, u, t)),
                    n && l.properties.relayout();
                }
              if (l.toolbar && l.toolbar !== this._annotationToolbar)
                l.toolbar.css("display", d ? "" : "none"),
                  c instanceof E ||
                    (d
                      ? (l.toolbar.gAccordion(
                          "toggleOpen",
                          c.getPage().hasFlag(a.GNode.Flag.Active)
                        ),
                        l.toolbar.gAccordion(
                          "init",
                          l.panel,
                          "label",
                          null,
                          "annotations"
                        ),
                        c.getPage().hasFlag(a.GNode.Flag.Active)
                          ? l.panel.addClass("g-active")
                          : l.panel.removeClass("g-active"))
                      : l.panel.css("display", "none"));
              else if (
                (l.panel.css("display", d ? "" : "none"),
                l.topArrow.css("display", d ? "" : "none"),
                d && !(c instanceof E))
              ) {
                let e = this._annotationToolbar.find("." + c._toolbarIcon);
                r.css("left", e.position().left + e.width() / 2 - 6),
                  r.css("visibility", "visible");
              }
              d && this._annotationsToolbarPanel.css("display", "");
            }
            this._document || (this._annotationPanels = []);
          } finally {
            this._updatingPropertyPanels = false;
          }
          return o;
        };
        !this._currentAnnotations &&
        this._document &&
        this._document.getAnnotationsId()
          ? w
              .getCloudAnnotationsForDocument(this._document)
              .then((e) => {
                let t = false;
                if (
                  this._document &&
                  this._document.getAnnotationsId() !== e.cid
                )
                  return (this._updatingPropertyPanels = false), t;
                if (
                  ((this._currentAnnotations = e.annotationsCollection),
                  (t = o()),
                  t)
                ) {
                  let t = this._document.getScene();
                  t &&
                    t.setLastTimeAnnotationsFromCloudModified(e.lastUpdateTime),
                    gDesigner.notifyDocumentModified(this._document),
                    this._active
                      ? this._activateAnnotations()
                      : this.trigger(h.UPDATE_EVENT);
                }
              })
              .catch((e) => {
                !this._active ||
                (e instanceof C &&
                  e.cid &&
                  this._document &&
                  this._document.getAnnotationsId() !== e.cid)
                  ? (this._updatingPropertyPanels = false)
                  : ((this._currentAnnotations = []), o());
              })
          : o();
      }

GAnnotationsSidebar.prototype.updateBadge = function (e) {
        var t = { unread: 0, total: 0 },
          n = this._annotationPanels.map((e) => e.properties.getPage()),
          o =
            this._document &&
            (this._document.isCloudFile() || this._document.isExternalFile());
        if (D && !this._active) {
          var i = gDesigner.getSyncUser();
          if (o) {
            if (this._currentAnnotations) {
              n.map((e) =>
                w.findAnnotationsListForPage(e, this._currentAnnotations)
              )
                .filter((e) => !!e)
                .forEach(function (e) {
                  e.$ &&
                    e.$.forEach(function (e) {
                      var n = w.isOwner(i, e);
                      e.rsv ||
                        (e.$ && 0 != e.$.length
                          ? (e.$.forEach(function (e) {
                              "cmt" == e["@"] &&
                                (i &&
                                  i.getUID() !== e.uid &&
                                  e.type !== a.GComment.Type.Close &&
                                  !(e.read || []).includes(i.getUID()) &&
                                  t.unread++,
                                t.total++);
                            }),
                            n ||
                              (e.read || []).includes(i.getUID()) ||
                              t.unread++,
                            t.total++)
                          : (n ||
                              (e.read || []).includes(i.getUID()) ||
                              t.unread++,
                            t.total++));
                    });
                });
            }
          } else if (this._localAnnotations) {
            n.map((e) =>
              w.findAnnotationsListForPage(e, this._localAnnotations)
            )
              .filter((e) => !!e)
              .forEach(function (e) {
                for (
                  var n = e.getFirstChild();
                  null !== n && n.hasMixin(a.GAnnotation);
                  n = n.getNext()
                ) {
                  var o = w.isOwner(i, n);
                  if (!n.getProperty("rsv"))
                    if (n.getChildren().length > 0) {
                      for (
                        var r = n.getFirstChild();
                        null !== r && r instanceof a.GComment;
                        r = r.getNext()
                      )
                        i &&
                          i.getUID() !== r.getProperty("uid") &&
                          r.getProperty("type") !== a.GComment.Type.Close &&
                          !(r.getProperty("read") || []).includes(i.getUID()) &&
                          t.unread++,
                          t.total++;
                      o ||
                        (n.getProperty("read") || []).includes(i.getUID()) ||
                        t.unread++,
                        t.total++;
                    } else
                      o ||
                        (n.getProperty("read") || []).includes(i.getUID()) ||
                        t.unread++,
                        t.total++;
                }
              });
          }
        }
        return (
          t.total > 0 &&
            (e.text(t.total),
            t.unread > 0 ? e.addClass("new") : e.removeClass("new")),
          !!t.total
        );
      }

GAnnotationsSidebar.prototype.isAnnotationPropertiesEditing = function () {
        return this._annotationProperties.some((e) => {
          let { properties: t } = e;
          return (t.isEditing && t.isEditing()) || !1;
        });
      }

GAnnotationsSidebar.prototype.updateNotificationOption = function () {
        const e = this._optionsToolbar
          .find(".notification-label")
          .closest(".columns");
        this._document && this._document.isCloudFile()
          ? (e.removeAttr("data-title"), e.toggleClass("g-disabled", !1))
          : (e.attr(
              "data-title",
              a.GLocale.get(
                new a.GLocaleKey("GAnnotationsSidebar", "text.save-file-tip")
              )
            ),
            e.toggleClass("g-disabled", !0));
      }

GAnnotationsSidebar.prototype.toString = function () {
        return "[Object GAnnotationsSidebar]";
      }

GAnnotationsSidebar.prototype._createHoverNotificationFrag = function () {
        let e = $("<div>")
          .addClass("g-menu hover-notification-container")
          .html(
            a.GLocale.get(
              new a.GLocaleKey("GAnnotationsSidebar", "text.hover-notification")
            )
          );
        return (
          e
            .find("span")
            .addClass("highlight")
            .click(() => {
              new u().then((e) => e.open());
            }),
          e
        );
      }

GAnnotationsSidebar.prototype._openHoverNotification = function (e) {
        let t = this._createHoverNotificationFrag(),
          n = $("body").find(".g-annotation-sidebar-notification-menu")[0];
        if (
          (t.appendTo($("body")),
          document.addEventListener("click", this._removeHoverNotificationFrag),
          n &&
            (n.addEventListener("mouseenter", function () {
              let e = $("body").find(".hover-notification-container");
              e.length && $(e[0]).css("display", "block");
            }),
            n.addEventListener("mouseleave", function () {
              let e = $("body").find(".hover-notification-container");
              e.length &&
                setTimeout(function () {
                  $(e[0]).css("display", "none");
                }, 250);
            }),
            $(n)
              .find("li")
              .map((e, t) => {
                t.addEventListener("mousedown", function () {
                  let e = $("body").find(".hover-notification-container");
                  e.length && $(e[0]).css("display", "none");
                });
              })),
          t.parent().is("body"))
        ) {
          var o = t.outerWidth(),
            i = t.outerHeight(),
            a = $(window).width(),
            r = $(window).height(),
            s = { x: 0, y: 0, width: 0, height: 0 },
            l = $(e),
            c = l.offset();
          (s.x = c.left),
            (s.y = c.top),
            (s.width = l.outerWidth()),
            (s.height = l.outerHeight());
          var d = 0;
          (d = s.x + s.width) + o > a && (d = s.x - o);
          var u = 0;
          (u = s.y + s.height) + i > r && (u = s.y - i);
          const n = this._rangeLeftX ? this._rangeLeftX : 0;
          d < n && (d = n);
          const p = this._rangeRightX ? this._rangeRightX : a;
          d + o >= p && (d = p - o);
          const g = this._rangeLeftY ? this._rangeLeftY : 0;
          u < g && (u = g);
          const h = this._rangeRightY ? this._rangeRightY : r;
          u + i >= h && (u = h - i);
          const f = u - i - 10;
          t.css("left", d),
            t.css("top", f),
            t.addClass("g-menu-right g-menu-bottom");
        }
      }

GAnnotationsSidebar.prototype._removeHoverNotificationFrag = function () {
        let e = $("body").find(".hover-notification-container");
        e.length &&
          (e.remove(),
          document.removeEventListener(
            "click",
            this._removeHoverNotificationFrag
          ));
      }

module.exports = GAnnotationsSidebar;
