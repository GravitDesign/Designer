/**
 * Webpack Module #358
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    n(58),
      n(19),
      n(8),
      n(71),
      n(4),
      n(41),
      n(13),
      n(32),
      n(38),
      n(97),
      n(33),
      n(26);
    var o = n(1),
      i = n(53),
      a = n(40),
      r = n(10),
      s = n(592),
      l = n(1094);
    const c = n(434);
    function d() {}
    async function u(e, t) {
      const n = gDesigner.getSyncUser(),
        o = gDesigner.getApplicationManager(),
        i = d.isOwner(n, e),
        a = (e.getProperty("asgn") || []).includes(n.getUID()),
        r = o.isCommentingEditingEnabled(),
        s = await o.hasAccess(t);
      return r && (s || i || a);
    }
    (d.getCloudAnnotationsForDocument = async function (e) {
      const t = e.getAnnotationsId();
      if (!t)
        throw new s(
          "GAnnotationsUtils.getCloudAnnotationsForDocument: can't get annotations id for the document"
        );
      const n = await e.getAnnotationsToken(t);
      return gDesigner
        .getAnnotationsManager()
        .getAnnotations(t, n)
        .then((o) => new l(o, t, n, e));
    }),
      (d.updateAndReturnCloudAnnotationsForDocument = async function (e, t) {
        const n = e.getAnnotationsId();
        if (!n)
          throw new s(
            "GAnnotationsUtils.updateAndReturnCloudAnnotationsForDocument: can't get annotations id for the document"
          );
        t || (t = []);
        const o = await e.getAnnotationsToken(n);
        return gDesigner
          .getAnnotationsManager()
          .updateAnnotations(n, this._prepareAnnotations(e, t), o)
          .then((t) => new l(t, n, o, e));
      }),
      (d._prepareAnnotations = function (e, t) {
        return t;
      }),
      (d.saveDocumentAnnotations = async function (e, t, n, i) {
        var a = t;
        if (
          ((n = n || e.getScene()),
          (!e.isCloudFile() && !e.isExternalFile()) ||
            !n ||
            (!n.hasAnnotations() && !n.isCloudAnnotations()))
        )
          return !1;
        var r = e.getId(),
          s = n.getProperty("cid"),
          c = e.getReservedId();
        let u = [];
        var p;
        n.iteratePages((e) => {
          let t = e.getAnnotations();
          i &&
            (d.removeSidFromAnnotations(t),
            e.getProperty("Guid") || d.removeGuidFromAnnotations(t)),
            u.push(t);
        }, !0);
        var g = null;
        const h = async () => {
          let e = await gApi.getFile(p, !0).catch(() => null);
          if (e && e.link_accesses && e.link_accesses.length)
            for (var t = 0; t < e.link_accesses.length && !g; ++t) {
              let n = e.link_accesses[t];
              if (n.token && n.comment) return n.token;
            }
          return null;
        };
        if (
          ((p = r || s || c) &&
            a &&
            ((g = await e.getAnnotationsToken(p)) || (g = await h())),
          !p)
        )
          try {
            const t = { trashed: null };
            let n = await gApi.createFile(t);
            (p = n.id) && e.setReservedId(p);
          } catch (e) {
            console.warn("Failed to record annotations");
          }
        if (!p) return !1;
        a && !g && (g = await h());
        const f = this._prepareAnnotations(e, u.map(o.GNode.store));
        return (
          f instanceof Array || (f.suppressNewPageNotifications = !!i),
          gDesigner
            .getAnnotationsManager()
            .updateAnnotations(p, f, g)
            .then((t) => {
              var r = new l(t, p, g, e);
              let s,
                c = r.annotationsCollection;
              return (
                (s =
                  (i && n.getLastSavedTime()) ||
                  new Date(r.lastUpdateTime).getTime()),
                c && c.length
                  ? (n.iteratePages((e) => {
                      let t = d.findAnnotationsListForPage(e, c);
                      t && e.setAnnotations(o.GNode.restore(t));
                    }, !0),
                    n.getProperty("cid") !== p && n.setCloudAnnotations(p),
                    a && g && n.setProperty("asec", g))
                  : (n.setCloudAnnotations(null),
                    n.cleanAnnotations(),
                    a && g && n.setProperty("asec", g)),
                n.setLastTimeAnnotationsFromCloudModified(s),
                !0
              );
            })
            .catch(
              (e) => (
                n.setCloudAnnotations(null),
                console.warn("Failed to record annotations: " + e),
                !1
              )
            )
        );
      }),
      (d.findAnnotationsListForPage = function (e, t) {
        const n =
          e.getProperty("Guid", !0) || e.getAnnotations().getProperty("Guid");
        let o = null;
        if (!t || !t.length) return o;
        if (
          (n &&
            (o = this._findInAnnotationsObj(
              t,
              (e) => e.Guid === n || e.aid === n,
              (e) => e.$Guid === n || e["@Guid"] === n || e.$aid === n
            )),
          !o)
        ) {
          const n = e.getAnnotations().getProperty("aid");
          n &&
            (o = this._findInAnnotationsObj(
              t,
              (e) => e.aid === n,
              (e) => e.$aid === n
            ));
        }
        if (!o) {
          const n = e.getId();
          n &&
            (o = this._findInAnnotationsObj(
              t,
              (e) => e.pgid === n,
              (e) => e.$pgid === n
            ));
        }
        return o;
      }),
      (d._findInAnnotationsObj = function (e, t, n) {
        return e.find((e) => (e instanceof o.GAnnotationsList ? n(e) : t(e)));
      }),
      (d.mergeAnnotations = function (e, t, n, i, r) {
        let s = {},
          l = {},
          c = !1;
        t.forEach((e) => {
          (l[e.getId()] = e),
            e.hasFlag(o.GNode.Flag.Selected) && (s[e.getId()] = 1);
        }),
          t.forEach((t) => {
            i.some((e) => e.getId() === t.getId()) ||
              (e.removeChild(t), (c = !0));
          });
        const d = [
          "$lmd",
          "$storedUrl",
          "$__ids",
          "$plkt",
          "$mtime",
          "$lkt",
          "@_lkt",
        ];
        r &&
          r instanceof Object &&
          d.push(...Object.keys(r).map((e) => "$" + e));
        for (let t = 0; t < i.length; t++) {
          let n = i[t],
            r = l[n.getId()];
          r &&
            ((0, a.isDifferent)(
              n,
              r,
              d.concat(n instanceof o.GRectangleAnnotation ? ["$cu"] : [])
            ) && ((0, a.mergeNode)(r, n), (c = !0)),
            r.setProperty("mtime", n.getProperty("mtime"))),
            1 === s[n.getId()] && n.setFlag(o.GNode.Flag.Selected),
            l[n.getId()] || (e.appendChild(n), (c = !0));
        }
        e.setProperty("sid", n.getProperty("sid") || null);
        const u = n.getProperty("Guid");
        return u && e.setProperty("Guid", u), c;
      }),
      (d.canDeleteAnnotation = function (e) {
        var t = gDesigner.getSyncUser();
        return d.isOwner(t, e);
      }),
      (d.removeAnnotations = function (e, t, n) {
        let o =
          !(arguments.length > 3 && void 0 !== arguments[3]) || arguments[3];
        if (!t || !t.getScene()) return;
        let a = t.getScene(),
          r = gDesigner.getActiveDocument();
        if (r.getScene() === a) {
          var s = !!r.getAnnotationsId();
          i.GAnnotationEditor.removeAnnotations(e, t, n, o, !s);
        }
      }),
      (d.filterAnnotationElements = function (e) {
        return e.filter(
          (e) => e.hasMixin(o.GAnnotation) || e instanceof o.GComment
        );
      }),
      (d.canResolveAnnotation = function (e) {
        return u(e, c.RESOLVE_COMMENT_ANNOTATION);
      }),
      (d.canReopenAnnotation = function (e) {
        return u(e, c.REOPEN_COMMENT_ANNOTATION);
      }),
      (d.isOwner = function (e, t) {
        if (e) {
          const n = t.getProperty ? t.getProperty("uid") : t.uid;
          return e.getUID() === n;
        }
        return !1;
      }),
      (d.canUpdate = function (e) {
        return (
          !(gDesigner.isAnonymous() && !r.ANONYMOUS_SESSION_ENABLED) && !!e
        );
      }),
      (d.resolveAllComments = function (e) {
        var t = e.getScene();
        t &&
          i.GEditor.tryRunTransaction(
            t,
            function () {
              t.iteratePages((e) => {
                e.getAnnotations().resolve();
              }, !0);
            },
            o.GLocale.get(
              new o.GLocaleKey(
                "GAnnotationsSidebar",
                "text.resolve-all-comments"
              )
            )
          );
      }),
      (d.getCommentsCount = function (e) {
        if (!e.annotations) return 0;
        let t = 0;
        const n = { annotationsCollection: e.annotations, lastUpdateTime: 0 };
        let o = new l(n, e.id);
        return (
          o &&
            o.annotationsCollection &&
            o.annotationsCollection.forEach((e) => {
              e.$ &&
                e.$.forEach(function (e) {
                  e.rsv ||
                    (e.$ &&
                      0 !== e.$.length &&
                      e.$.forEach(function (e) {
                        "cmt" === e["@"] && t++;
                      }),
                    t++);
                });
            }),
          t
        );
      }),
      (d.removeSidFromAnnotations = function (e) {
        d.setPropertyValueInAnnotations(e, "sid", null);
      }),
      (d.removeGuidFromAnnotations = function (e) {
        d.setPropertyValueInAnnotations(e, "Guid", "");
      }),
      (d.setPropertyValueInAnnotations = function (e, t, n, i) {
        e.accept((e) => {
          (e instanceof o.GAnnotationsList ||
            e.hasMixin(o.GAnnotation) ||
            e instanceof o.GComment) &&
            e.setProperty(t, n, i);
        });
      }),
      (e.exports = d);
  }