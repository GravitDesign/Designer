/**
 * Webpack Module #1600
 * Type: class
 * Name: GMergeSubAction
 */

function (e, t, n) {
    "use strict";
    var o = n(16);
    n(19), n(4), n(32), n(33), n(26);
    var i = n(1),
      a = n(15),
      r = o(n(18)),
      s = o(n(1168)),
      l = n(40),
      c = n(67),
      d = o(n(812)),
      u = n(10);
    class p extends s.default {
      constructor(e) {
        super(e),
          (this._title = new i.GLocaleKey(
            "GMergeSubAction",
            "title.".concat(this._type)
          )),
          (this._transactionType = null);
      }
      _getMainActionId() {
        return d.default.ID;
      }
      getFullTitle() {
        const e = this.getTitle(),
          t = this.getMainAction().getTitle();
        return "".concat(i.GLocale.get(t), " (").concat(i.GLocale.get(e), ")");
      }
      getCategory() {
        return r.default.CATEGORY_MODIFY_COMBINE;
      }
      getGroup() {
        return "structure-boolean/combine";
      }
      getIcon() {
        switch (this._type) {
          case p.Type.Union:
            return "gravit-icon-merge-union";
          case p.Type.Subtract:
            return "gravit-icon-merge-subtract";
          case p.Type.Intersect:
            return "gravit-icon-merge-intersect";
          case p.Type.Difference:
            return "gravit-icon-merge-difference";
          default:
            return null;
        }
      }
      isVisible() {
        return !0;
      }
      getShortcutSubKey() {
        switch (this._type) {
          case p.Type.Union:
            return a.GKey.Constant.U;
          case p.Type.Subtract:
            return a.GKey.Constant.S;
          case p.Type.Intersect:
            return a.GKey.Constant.I;
          case p.Type.Difference:
            return a.GKey.Constant.X;
          default:
            return null;
        }
      }
      execute() {
        const e = gDesigner.getActiveDocument().getEditor(),
          t = e && i.GNode.order(e.getIndividualSelection().slice());
        if (!t) return;
        e.beginTransaction();
        const n = this._shouldChangeBooleanOperation(t);
        try {
          n
            ? (this._setTransactionType(p.TransactionType.Merge),
              this._changeBooleanOperationType(t[0]))
            : (this._setTransactionType(p.TransactionType.Combine),
              this._createCompoundShape(e, t));
        } finally {
          e.commitTransaction(this._getTransactionName());
        }
      }
      _setTransactionType(e) {
        this._transactionType = e;
      }
      _getTransactionName() {
        return i.GLocale.getValue(
          "GMergeSubAction",
          "transaction.".concat(this._transactionType)
        );
      }
      _shouldChangeBooleanOperation(e) {
        const [t] = e;
        return (
          1 === e.length &&
          (t instanceof i.GCompoundShape ||
            1 === d.default.getValidItems(t).length)
        );
      }
      _changeBooleanOperationType(e) {
        if (
          e.getParent() instanceof i.GCompoundShape &&
          (e instanceof i.GCompoundShape ||
            (e.hasMixin(i.GVertexSource) && !(e instanceof i.GGroup)))
        )
          return e.setProperty("bool", this._getBooleanOperationType());
        if (e instanceof i.GCompoundShape && e.getFirstChild())
          for (let t = e.getFirstChild().getNext(); null !== t; t = t.getNext())
            t.setProperty("bool", this._getBooleanOperationType());
      }
      _createCompoundShape(e, t) {
        const n = new i.GCompoundShape();
        let o,
          a = [];
        if (
          (t.forEach((e) => {
            a = a.concat(d.default.getValidItems(e));
          }),
          a.length > 1)
        ) {
          const r = t[t.length - 1];
          let s = r.getParent(),
            c = r.getNext();
          for (; !n.validateInsertion(s); )
            (c = s.getNext()), (s = s.getParent());
          if (!s) return;
          s.insertChild(n, c);
          try {
            const t = [],
              r = [];
            let s = null;
            (o = new Set()),
              a.forEach((e) => {
                e.getParent() instanceof i.GCompoundShape
                  ? (t.push(e), s || (s = e.getParent()))
                  : r.push(e),
                  o.add(e.getParent());
              }),
              (a = t.concat(r));
            const c = s || a[0];
            if (
              ((0, l.blockChanges)(e, o, null, n),
              n.assignStyleFrom(c),
              c instanceof i.GText)
            ) {
              const e = c;
              if (
                !e.getPaintLayers().getFillLayers(!0).length &&
                e.getProperty("_fc")
              ) {
                n.getPaintLayers().clearFillLayers();
                const t =
                  "string" == typeof e.getProperty("_fc")
                    ? i.GRGBColor.fromCSSColor(e.getProperty("_fc"))
                    : e.getProperty("_fc");
                n.getPaintLayers().appendChild(
                  new i.GStylable.FillPaintLayer(t)
                );
              }
            }
            a.forEach((e) => {
              let t,
                o = e.getParent();
              for (
                !(
                  o === s ||
                  (o instanceof i.GCompoundShape && this._type === p.Type.Union)
                ) && e.setProperty("bool", this._getBooleanOperationType()),
                  o.removeChild(e);
                (o instanceof i.GGroup || o instanceof i.GCompoundShape) &&
                !o.getFirstChild();

              )
                (t = o), (o = o.getParent()), o.removeChild(t);
              n.appendChild(e);
            });
          } finally {
            (0, l.releaseChanges)(e, o, null, n);
          }
          e.updateSelection(!1, [n]);
        }
      }
      _getBooleanOperationType() {
        switch (this._type) {
          case p.Type.Union:
            return i.GVertexPolyBoolean.OR;
          case p.Type.Subtract:
            return i.GVertexPolyBoolean.SUB;
          case p.Type.Intersect:
            return i.GVertexPolyBoolean.AND;
          case p.Type.Difference:
            return i.GVertexPolyBoolean.XOR;
          default:
            throw new Error("Type is not valid.");
        }
      }
      getTooltipConfig(e) {
        return e && p.TOOLTIP_CONFIG[e]
          ? p.TOOLTIP_CONFIG[e][this._type]
          : null;
      }
      toString() {
        return "[Object GMergeSubAction]";
      }
    }
    (p.Type = {
      Union: "union",
      Subtract: "subtract",
      Intersect: "intersect",
      Difference: "difference",
    }),
      (p.TransactionType = { Merge: "merge", Combine: "combine" }),
      (p.TOOLTIP_CONFIG = {
        [c.TOOLTIP_AREA.TOOLBAR]: {
          [p.Type.Union]: c.GRichTooltipConfig.from({
            title: i.GLocale.getValue("GMergeSubAction", "tooltip.union.title"),
            description: i.GLocale.getValue(
              "GMergeSubAction",
              "tooltip.union.description"
            ),
            video: u.gApi.getRichTooltipVideoURL("Boolean_Union.mp4"),
            middle: !1,
            learnMore:
              "",
          }),
          [p.Type.Subtract]: c.GRichTooltipConfig.from({
            title: i.GLocale.getValue(
              "GMergeSubAction",
              "tooltip.substract.title"
            ),
            description: i.GLocale.getValue(
              "GMergeSubAction",
              "tooltip.substract.description"
            ),
            video: u.gApi.getRichTooltipVideoURL("Boolean_Subtract.mp4"),
            middle: !1,
            learnMore:
              "",
          }),
          [p.Type.Intersect]: c.GRichTooltipConfig.from({
            title: i.GLocale.getValue(
              "GMergeSubAction",
              "tooltip.intersect.title"
            ),
            description: i.GLocale.getValue(
              "GMergeSubAction",
              "tooltip.intersect.description"
            ),
            video: u.gApi.getRichTooltipVideoURL("Boolean_Intersect.mp4"),
            middle: !1,
            learnMore:
              "",
          }),
          [p.Type.Difference]: c.GRichTooltipConfig.from({
            title: i.GLocale.getValue(
              "GMergeSubAction",
              "tooltip.difference.title"
            ),
            description: i.GLocale.getValue(
              "GMergeSubAction",
              "tooltip.difference.description"
            ),
            video: u.gApi.getRichTooltipVideoURL("Boolean_Difference.mp4"),
            middle: !1,
            learnMore:
              "",
          }),
        },
      }),
      (e.exports = p);
  }