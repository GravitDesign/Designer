/**
 * Webpack Module #67
 * Type: class
 * Name: GRichTooltipConfig
 */

function (e, t, n) {
    "use strict";
    Object.defineProperty(t, "__esModule", { value: !0 }),
      (t.default = t.TOOLTIP_AREA = t.GRichTooltipConfig = void 0),
      n(290),
      n(3);
    const o = (t.GRichTooltipConfig = function (e) {
      let {
        title: t,
        description: n,
        video: o,
        pic: i,
        isPro: a,
        middle: r,
        shortcut: s,
        videoTimeout: l,
        marginLeft: c,
        side: d,
        learnMore: u,
        upgradeToProStatsValue: p,
        forceShow: g,
        flipHorizontal: h,
      } = e;
      if (!t) throw new Error("");
      (this._title = t),
        (this._description = n),
        (this._video = o),
        (this._pic = i),
        (this._isPro = a),
        (this._middle = r),
        (this._marginLeft = c),
        (this._shortcut = s),
        (this._videoTimeout = l),
        (this._side = d),
        (this._learnMore = u),
        (this._upgradeToProStatsValue = p),
        (this._forceShow = g),
        (this._flipHorizontal = h);
    });
    (o.from = function (e) {
      return new o(e);
    }),
      (o.prototype._title = null),
      (o.prototype._description = null),
      (o.prototype._video = null),
      (o.prototype._pic = null),
      (o.prototype._isPro = null),
      (o.prototype._middle = null),
      (o.prototype._marginLeft = null),
      (o.prototype._shortcut = null),
      (o.prototype._videoTimeout = null),
      (o.prototype._side = null),
      (o.prototype._learnMore = null),
      (o.prototype._upgradeToProStatsValue = null),
      (o.prototype._forceShow = !1),
      (o.prototype._flipHorizontal = !1),
      (o.prototype.setConfig = function (e) {
        let {
          title: t,
          description: n,
          video: o,
          pic: i,
          isPro: a,
          middle: r,
          shortcut: s,
          videoTimeout: l,
          marginLeft: c,
          side: d,
          learnMore: u,
          upgradeToProStatsValue: p,
        } = e;
        if ((void 0 !== t && (this._title = t), !this._title))
          throw new Error("");
        return (
          void 0 !== n && (this._description = n),
          void 0 !== o && (this._video = o),
          void 0 !== i && (this._pic = i),
          void 0 !== a && (this._isPro = a),
          void 0 !== r && (this._middle = r),
          void 0 !== s && (this._shortcut = s),
          void 0 !== l && (this._videoTimeout = l),
          void 0 !== c && (this._marginLeft = c),
          void 0 !== d && (this._side = d),
          void 0 !== u && (this._learnMore = u),
          void 0 !== p && (this._upgradeToProStatsValue = p),
          this
        );
      }),
      (o.prototype.getConfig = function () {
        return {
          title: this._title,
          description: this._description,
          video: this._video,
          pic: this._pic,
          isPro: this._isPro,
          middle: this._middle,
          marginLeft: this._marginLeft,
          shortcut: this._shortcut,
          videoTimeout: this._videoTimeout,
          side: this._side,
          learnMore: this._learnMore,
          upgradeToProStatsValue: this._upgradeToProStatsValue,
          forceShow: this._forceShow,
          flipHorizontal: this._flipHorizontal,
        };
      }),
      (o.prototype.toString = function () {
        return "[Object GRichTooltipConfig]";
      });
    t.TOOLTIP_AREA = {
      TOOLBAR: "TOOLBAR",
      SIDEBAR: "SIDEBAR",
      MAIN_MENU: {
        TRY_PRO_COMMON: "TRY_PRO_COMMON",
        TRY_EXP_PDF_ADVANCED_SETTING: "TRY_EXP_PDF_ADVANCED_SETTING",
      },
    };
    t.default = o;
  }