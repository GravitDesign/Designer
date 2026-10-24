/**
 * Webpack Module #1713
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    n(19), n(8), n(4), n(41), n(32), n(97), n(33), n(26);
    const { GObject: o } = n(1),
      { GPlatform: i } = n(15),
      a = n(1355),
      r = n(1191),
      s = n(1356),
      l = n(1357),
      { handleCollabsData: c } = (n(536), n(882)),
      d = n(1354),
      u = n(434);
    function p() {
      for (var e = arguments.length, t = new Array(e), n = 0; n < e; n++)
        t[n] = arguments[n];
      a.call(this, ...t), r.call(this);
    }
    o.inheritAndMix(p, a, [r]),
      (p.prototype._checkTreeSanity = function () {
        return !!$(this._container).data("gannotationpanel");
      }),
      (p.prototype.clean = function () {
        a.prototype.clean.call(this), this.clearChildren();
      }),
      (p.prototype._isInvalidationBlocked = function () {
        return !!this.isEditingOrAddingContent();
      }),
      (p.prototype.isEditingOrAddingContent = function () {
        return (
          !!this.getChildren()
            .filter((e) => e instanceof l)
            .some((e) => e.isVisible()) ||
          !!this.getChildren()
            .filter((e) => e instanceof s)
            .some((e) => e.isEditMode())
        );
      }),
      (p.prototype._hasResolveAccess = !1),
      (p.prototype._hasReopenAccess = !1),
      (p.prototype._mentionData = {}),
      (p.prototype.hasResolveAccess = function () {
        return this._hasResolveAccess;
      }),
      (p.prototype.hasReopenAccess = function () {
        return this._hasReopenAccess;
      }),
      (p.prototype.getMentionData = function () {
        return this._mentionData || {};
      }),
      (p.prototype.getCollaboratorsCache = function () {
        return this._collaboratorsCache;
      }),
      (p.prototype._beforeInvalidationStart = async function () {
        let e =
          arguments.length > 0 && void 0 !== arguments[0]
            ? arguments[0]
            : new d();
        this.clearChildren();
        var t = gDesigner.getApplicationManager();
        (this._hasResolveAccess = await t.hasAccess(
          u.RESOLVE_COMMENT_ANNOTATION
        )),
          (this._hasReopenAccess = await t.hasAccess(
            u.REOPEN_COMMENT_ANNOTATION
          ));
        const n = gDesigner.getActiveDocument(),
          o = gDesigner.getShareManager();
        e.collaboratorsCache && o.resetCollaboratorsCached(n),
          (this._collaboratorsCache = o.getCollaboratorsCached(n)),
          (this._mentionData = await c(this._collaboratorsCache));
      }),
      (p.prototype._afterInvalidationEnd = function () {
        this.scrollIntoView(), this._updateCommentStats();
      }),
      (p.prototype.scrollIntoView = function () {
        $(this._container).gAnnotationPanel("scrollIntoView");
      }),
      (p.prototype._updateCommentStats = function () {
        let e = 0,
          t = 0,
          n = this.getChildren(),
          o = $(this._container).data("gannotationpanel"),
          i = o && o.options;
        n &&
          n.forEach((n) => {
            n instanceof s &&
              !n.isParentAnnotationResolved() &&
              (n.isRead() || t++, e++);
          }),
          i && i.updateCommentCount && i.updateCommentCount(e, t);
      }),
      (p.prototype.getCommentStats = function () {
        return this._commentStats;
      }),
      (e.exports = p);
  }