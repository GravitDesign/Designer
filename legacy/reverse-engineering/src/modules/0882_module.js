/**
 * Webpack Module #882
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(16);
    Object.defineProperty(t, "__esModule", { value: !0 }),
      (t.getCollabInfo = c),
      (t.handleCollabsData = async function (e) {
        if (
          !gDesigner.getActiveDocument() ||
          !gDesigner.getActiveDocument().getStorageItem()
        )
          return;
        let t = [];
        const n = e
          ? await e
          : gDesigner
              .getShareManager()
              .getCollaboratorsCached(gDesigner.getActiveDocument());
        if (n && n.length)
          for (let e = 0; e < n.length; e++) {
            let o = n[e];
            if (
              !o.getRole().is(i.ShareRoles.Viewer) &&
              !o.getRole().is(i.ShareRoles.NoAccess)
            ) {
              let e = await c(o.getUID());
              t.push(a.default.createUserMention(o, e));
            }
          }
        let o,
          s,
          l,
          d,
          u = [];
        if (t.length) {
          (o = t.filter((e) => e.getRole().is(i.ShareRoles.Reviewer))),
            (s = t.filter((e) => e.getRole().is(i.ShareRoles.Approver))),
            (l = t.filter((e) => e.getRole().is(i.ShareRoles.CoAuthor))),
            (d = t.filter((e) => e.getRole().is(i.ShareRoles.Owner)));
          const e = (0, r.createAdditionalMentions)();
          o && o.length && u.push(e.MENTION_ALL_REVIEWERS),
            s && s.length && u.push(e.MENTION_ALL_APPROVERS),
            l && l.length && u.push(e.MENTION_ALL_CO_AUTHORS),
            d && d.length && u.push(e.MENTION_OWNER),
            u.push(e.MENTION_ALL);
        }
        return {
          data: t,
          allReviewers: o,
          allApprovers: s,
          allCoAuthors: l,
          owner: d,
          additionalMentions: u,
        };
      }),
      (t.replaceAdditionalCollabShowTextBeforeSend = function (e) {
        const t = (0, r.createAdditionalMentions)();
        return (
          this._mentionsCollection.forEach((n) => {
            n.id === t.MENTION_ALL.id
              ? e.replace(t.MENTION_ALL.showText, t.MENTION_ALL.id)
              : n.id === t.MENTION_OWNER.id
              ? e.replace(t.MENTION_OWNER.showText, t.MENTION_OWNER.id)
              : n.id === t.MENTION_ALL_REVIEWERS.id
              ? e.replace(
                  t.MENTION_ALL_REVIEWERS.showText,
                  t.MENTION_ALL_REVIEWERS.id
                )
              : n.id === t.MENTION_ALL_APPROVERS.id
              ? e.replace(
                  t.MENTION_ALL_APPROVERS.showText,
                  t.MENTION_ALL_APPROVERS.id
                )
              : n.id === t.MENTION_ALL_CO_AUTHORS.id &&
                e.replace(
                  t.MENTION_ALL_CO_AUTHORS.showText,
                  t.MENTION_ALL_CO_AUTHORS.id
                );
          }),
          e
        );
      }),
      (t.showAssigneeRow = function (e) {
        if (!e || !e.length) return;
        e.mentionsInput("getMentions", (e) => {
          if (
            ((this._mentionsCollection = e), this._mentionsCollection.length)
          ) {
            this._assigneeRow.show();
            let e = this._mentionsCollection.reduce((e, t) => {
              let n = [],
                o = e.map((e) => e.id);
              return (
                (n =
                  t.id === s.MENTION_ALL_REVIEWERS.id &&
                  this._mentionData &&
                  this._mentionData.allReviewers &&
                  this._mentionData.allReviewers.length
                    ? this._mentionData.allReviewers.filter(
                        (e) => !o.includes(e.id)
                      )
                    : t.id === s.MENTION_ALL_APPROVERS.id &&
                      this._mentionData &&
                      this._mentionData.allApprovers &&
                      this._mentionData.allApprovers.length
                    ? this._mentionData.allApprovers.filter(
                        (e) => !o.includes(e.id)
                      )
                    : t.id === s.MENTION_ALL_CO_AUTHORS.id &&
                      this._mentionData &&
                      this._mentionData.allCoAuthors &&
                      this._mentionData.allCoAuthors.length
                    ? this._mentionData.allCoAuthors.filter(
                        (e) => !o.includes(e.id)
                      )
                    : t.id === s.MENTION_ALL.id
                    ? this._data.filter((e) => !o.includes(e.id))
                    : t.id === s.MENTION_OWNER.id &&
                      this._owner &&
                      this._owner.length
                    ? this._owner.filter((e) => !o.includes(e.id))
                    : o.includes(t.id)
                    ? []
                    : [t]),
                e.push(...n),
                e
              );
            }, []);
            if (1 === e.length)
              this._assigneeSelector.hide(),
                this._onlyOneAssignee.html(e[0].name),
                this._onlyOneAssignee.show();
            else {
              this._onlyOneAssignee.hide();
              let t = this._assigneeSelector.find("select");
              t.find("option").remove(),
                e.forEach((e) => {
                  t.append($("<option>").attr("value", e.id).text(e.name));
                }),
                this._assigneeSelector.show();
            }
            d.call(this, e[0].id);
          } else
            this._assigneeRow.hide(),
              (this._shouldAssign = !1),
              this._assigneeCheckBox.prop("checked", this._shouldAssign);
        });
      }),
      (t.updateAssignee = d),
      n(58),
      n(19),
      n(168),
      n(8),
      n(20),
      n(71),
      n(34),
      n(4),
      n(41),
      n(13),
      n(32),
      n(38),
      n(169),
      n(33),
      n(26);
    var i = n(10),
      a = o(n(883)),
      r = n(1353);
    const s = (0, r.createAdditionalMentions)(),
      l = {};
    async function c(e) {
      return (
        l.hasOwnProperty(e) || (l[e] = i.gApi.getUser(e, !0).catch(() => null)),
        l[e]
      );
    }
    function d(e) {
      e && e.length && (this._assignees = [e]);
    }
  }