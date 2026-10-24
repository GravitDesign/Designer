/**
 * Webpack Module #1587
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    var o = n(16);
    n(58),
      n(19),
      n(168),
      n(20),
      n(71),
      n(247),
      n(4),
      n(13),
      n(32),
      n(38),
      n(169),
      n(33),
      n(26);
    var i = n(15),
      a = n(53),
      r = n(1),
      s = o(n(78)),
      l = o(n(1330)),
      c = o(n(238)),
      d = o(n(339)),
      u = o(n(1331)),
      p = o(n(877)),
      g = o(n(1183)),
      h = o(n(1184)),
      f = o(n(875)),
      m = o(n(876)),
      y = o(n(1332)),
      v = o(n(811)),
      _ = o(n(870)),
      b = o(n(1333)),
      w = o(n(1334)),
      C = o(n(869)),
      x = o(n(1335)),
      S = o(n(810)),
      E = o(n(1336)),
      A = o(n(1337)),
      T = o(n(1590)),
      G = o(n(878)),
      P = o(n(879));
    class D extends G.default {
      constructor(e) {
        super(e),
          this.addGesture(new P.default()),
          this.setDelayedTouchEventsEnabled(!1);
      }
      _handleEvent(e) {
        e.cancelable && (e.preventDefault(), e.stopPropagation()),
          super._handleEvent(e);
      }
    }
    const L = {
        [i.GKey.Constant.LEFT]: 37,
        [i.GKey.Constant.UP]: 38,
        [i.GKey.Constant.RIGHT]: 39,
        [i.GKey.Constant.DOWN]: 40,
        [i.GKey.Constant.SHIFT]: 16,
        [i.GKey.Constant.CONTROL]: 17,
        [i.GKey.Constant.ALT_LEFT]: 18,
      },
      I = Object.values(L),
      k = (e, t) => {
        const n = gDesigner.getActiveDocument(),
          o = n && n.getActiveWindow(),
          i = o && o.getView(),
          a = i && i.getHtmlElement();
        a && a.dispatchEvent(new KeyboardEvent(e, { keyCode: t }));
      },
      O = (e) =>
        e === i.GKey.Constant.ALT_LEFT ||
        e === i.GKey.Constant.ALT_RIGHT ||
        e === i.GKey.Constant.SHIFT ||
        e === i.GKey.Constant.CONTROL,
      F = [
        i.GKey.Constant.UP,
        i.GKey.Constant.LEFT,
        i.GKey.Constant.RIGHT,
        i.GKey.Constant.DOWN,
      ];
    function R(e) {
      (this._htmlElement = e),
        (this._keyState = {}),
        (this._heldKeys = new Map()),
        (this._keyDownInveral = {}),
        (this._keyDownBound = this._keyDown.bind(this)),
        (this._keyUpBound = this._keyUp.bind(this)),
        (this._mouseUpBound = this._mouseup.bind(this)),
        (this._touchHandler = new T.default()),
        this.init();
    }
    (R.prototype._touchHandler = null),
      (R.prototype._htmlElement = null),
      (R.prototype._keyState = null),
      (R.prototype._heldKeys = null),
      (R.prototype._keyDownInveral = null),
      (R.prototype._document = null),
      (R.prototype._keyDownBound = null),
      (R.prototype._keyUpBound = null),
      (R.prototype._mouseUpBound = null),
      (R.prototype.init = function () {
        i.GPlatform.constructor.bypassKeyDownRestrictionByClassName(
          "g-virtual-key"
        ),
          this._htmlElement.gCollapsible();
        const e = $("<div/>").addClass("container").appendTo(this._htmlElement),
          t = (e) => {
            const t = this._keyDownInveral[e];
            t && (clearInterval(t), delete this._keyDownInveral[e]),
              O(e) && i.GPlatform.releaseKey(e),
              k("keyup", L[e]);
          },
          n = (e) => {
            const t = this._keyDownInveral[e];
            t && clearInterval(t),
              ((e) => F.includes(e))(e) &&
                (this._keyDownInveral[e] = setInterval(() => {
                  k("keydown", L[e]);
                }, 100)),
              O(e) && i.GPlatform.holdKey(e),
              k("keydown", L[e]);
          },
          o = (e) => {
            let { key: o, icon: a, dblclick: r, actionClass: l } = e;
            const c = s({
              name: a ? null : i.GKey.toLocalizedShort(o, !0),
              icon: a,
              actionClass: "g-virtual-key" + (l ? " " + l : ""),
              mousedown: (e) => {
                e.stopImmediatePropagation(), this._isHoldingKey(o) || n(o);
              },
              click: (e) => {
                e.stopImmediatePropagation(),
                  this._isHoldingKey(o) ||
                    (t(o), gDesigner.stats("virtualkey_assistantbar_click", o));
              },
              dblclick: r,
              mouseup: (e) => {
                e.stopImmediatePropagation(), this._isHoldingKey(o) || t(o);
              },
              touchstart: () => {
                this._isHoldingKey(o) || n(o);
              },
              touchend: () => {
                this._isHoldingKey(o) || t(o);
              },
              touchcancel: () => {
                this._isHoldingKey(o) || t(o);
              },
              active: () => !!this._keyState[L[o]] || this._isHoldingKey(o),
            });
            return new D(c[0]), c;
          },
          r = function (e) {
            let t =
              arguments.length > 1 && void 0 !== arguments[1]
                ? arguments[1]
                : "";
            return e.reduce((e, t) => {
              let { icon: n, action: o, isEnabled: i } = t;
              const a = e.createAddItem(o);
              return (
                n && a.setIcon(n),
                i &&
                  a.addEventListener(d.default.UpdateEvent, () => {
                    a.setEnabled(i());
                  }),
                e
              );
            }, new c.default(null, "g-assistant-bar-menu" + (t ? " " + t : "")));
          },
          s = (e) => {
            let {
              action: t,
              name: n,
              menu: o,
              icon: i,
              click: a,
              dblclick: r,
              mousedown: s,
              mouseup: l,
              touchstart: c,
              touchmove: d,
              touchend: u,
              touchcancel: p,
              split: g = !1,
              active: h,
              actionClass: f,
            } = e;
            const m = $("<div/>")
                .addClass("toolbar-button")
                .toggleClass("split", !!g),
              y = $("<button/>").addClass("action-button").appendTo(m);
            if (
              (f && y.addClass(f),
              h && (m.data("active", h), m.toggleClass("g-active", !!h())),
              t &&
                (m.data("action", t),
                i || (i = t.getIcon()),
                a ||
                  (a = () =>
                    gDesigner.executeAction(
                      t.getId(),
                      void 0,
                      "assistantbar"
                    ))),
              n && $("<span/>").text(n).appendTo(y),
              i && $("<span/>").addClass(i).appendTo(y),
              a && y.on("click", a),
              r && y.on("dblclick", r),
              s && m.on("mousedown", s),
              l && m.on("mouseup", l),
              c && m.on("touchstart", c),
              d && m.on("touchmove", d),
              u && m.on("touchend", u),
              p && m.on("touchcancel", p),
              o)
            ) {
              let e;
              (o.__which = "assistantbar"),
                (e = g
                  ? $("<button/>")
                      .addClass("dropdown-button")
                      .append(
                        $("<span></span>").addClass(
                          "gravit-icon-touch-arrow-up"
                        )
                      )
                      .appendTo(m)
                  : y.append(
                      $("<span></span>").addClass("gravit-icon-touch-arrow-up")
                    )),
                e.gMenuButton({ menu: o, touch: !0 });
            }
            return m;
          },
          l = $("<div/>").addClass("left-side").appendTo(e),
          T = $("<div/>")
            .addClass("right-side")
            .appendTo(e)
            .gCollapsible({ orientation: A.default.Orientation.Horizontal })
            .gCollapsible("collapse")
            .on("visibilitychanged", (e, t) => {
              gContainer.setProperty(
                "designer.assistant-bar.left-side.expanded",
                !!t
              );
            });
        $("<div/>")
          .gPropertyRow({
            height: "auto",
            columns: [
              {
                width: "86px",
                content: o({
                  key: i.GKey.Constant.SHIFT,
                  actionClass: "g-virtual-key-".concat(i.GKey.Constant.SHIFT),
                  dblclick: () =>
                    this._toggleModifierKey(i.GKey.Constant.SHIFT),
                }),
              },
              {
                width: "auto",
                content: s({
                  icon: "gravit-icon-touch-copy",
                  action: gDesigner.getAction(u.default.ID_COPY),
                }),
              },
              {
                width: "68px",
                content: s({
                  icon: "gravit-icon-touch-paste",
                  action: gDesigner.getAction(p.default.ID),
                  menu: r(
                    [
                      {
                        icon: "gravit-icon-touch-paste-in-place",
                        action: gDesigner.getAction(g.default.ID),
                      },
                      {
                        icon: "gravit-icon-touch-paste-inside",
                        action: gDesigner.getAction(h.default.ID),
                      },
                      {
                        icon: "gravit-icon-touch-paste-and-replace",
                        action: gDesigner.getAction(m.default.ID),
                      },
                      {
                        icon: "gravit-icon-touch-paste-style",
                        action: gDesigner.getAction(f.default.ID),
                      },
                    ],
                    "paste-menu"
                  ),
                  split: !0,
                }),
              },
              {
                width: "auto",
                content: s({
                  icon: "gravit-icon-touch-trash-2",
                  action: gDesigner.getAction(y.default.ID),
                }),
              },
              {
                width: "auto",
                content: s({
                  icon: "gravit-icon-touch-selection",
                  click: () => {
                    const e = gDesigner.getActiveDocument(),
                      t = e && e.getEditor();
                    if (t) {
                      t.getSelection() && t.getSelection().length > 0
                        ? gDesigner.executeAction(
                            w.default.ID,
                            void 0,
                            "assistantbar"
                          )
                        : gDesigner.executeAction(
                            b.default.ID,
                            void 0,
                            "assistantbar"
                          );
                    }
                  },
                }),
              },
              {
                width: "62px",
                content: s({
                  icon: "gravit-icon-touch-arrange-order",
                  menu: r(
                    Object.values(a.GEditor.ArrangeOrderType).map((e) => ({
                      icon: "gravit-icon-touch-arrange-" + e,
                      action: gDesigner.getAction(C.default.ID + "." + e),
                      isEnabled: () => this._isArrangeActionEnabled(e),
                    })),
                    "arrange-menu"
                  ),
                }),
              },
              {
                width: "auto",
                content: s({
                  icon: "gravit-icon-touch-fullscreen",
                  action: gDesigner.getAction(x.default.ID),
                  active: () =>
                    gDesigner.getAction(x.default.ID).isFullscreen(),
                }),
              },
            ],
          })
          .appendTo(l),
          $("<div/>")
            .gPropertyRow({
              height: "auto",
              columns: [
                {
                  width: "86px",
                  content: o({
                    key: i.GKey.Constant.CONTROL,
                    actionClass: "g-virtual-key-".concat(
                      i.GKey.Constant.CONTROL
                    ),
                    dblclick: () =>
                      this._toggleModifierKey(i.GKey.Constant.CONTROL),
                  }),
                },
                {
                  width: "114px",
                  content: o({
                    key: i.GKey.Constant.ALT_LEFT,
                    actionClass: "g-virtual-key-".concat(
                      i.GKey.Constant.ALT_LEFT
                    ),
                    dblclick: () =>
                      this._toggleModifierKey(i.GKey.Constant.ALT_LEFT),
                  }),
                },
                {
                  width: "auto",
                  content: s({
                    icon: "gravit-icon-touch-group",
                    action: gDesigner.getAction(v.default.ID),
                  }),
                },
                {
                  width: "auto",
                  content: s({
                    icon: "gravit-icon-touch-ungroup",
                    action: gDesigner.getAction(_.default.ID),
                  }),
                },
                {
                  width: "62px",
                  content: s({
                    icon: "gravit-icon-touch-convert-to-path",
                    action: gDesigner.getAction(S.default.ID),
                  }),
                },
                {
                  width: "auto",
                  content: s({
                    icon: "gravit-icon-touch-help",
                    click: () =>
                      gDesigner.executeAction(
                        E.default.ID,
                        void 0,
                        "assistantbar"
                      ),
                  }),
                },
              ],
            })
            .appendTo(l),
          $("<div/>")
            .gPropertyRow({
              height: "auto",
              columns: [
                {
                  width: "auto",
                  content: o({
                    key: i.GKey.Constant.UP,
                    icon: "gravit-icon-touch-arrow-key-up",
                  }),
                },
                {
                  width: "auto",
                  content: o({
                    key: i.GKey.Constant.DOWN,
                    icon: "gravit-icon-touch-arrow-key-down",
                  }),
                },
              ],
            })
            .appendTo(T),
          $("<div/>")
            .gPropertyRow({
              height: "auto",
              columns: [
                {
                  width: "auto",
                  content: o({
                    key: i.GKey.Constant.LEFT,
                    icon: "gravit-icon-touch-arrow-key-left",
                  }),
                },
                {
                  width: "auto",
                  content: o({
                    key: i.GKey.Constant.RIGHT,
                    icon: "gravit-icon-touch-arrow-key-right",
                  }),
                },
              ],
            })
            .appendTo(T),
          gContainer
            .getProperty("designer.assistant-bar.left-side.expanded")
            .then((e) => {
              T.gCollapsible(e ? "expand" : "collapse");
            });
      }),
      (R.prototype._toggleModifierKey = function (e) {
        const t = !i.GPlatform.isHoldingKey(e);
        this._toggleKey(e, t),
          this._htmlElement
            .find(".g-virtual-key-".concat(e))
            .toggleClass("g-held", t),
          this._updateActions();
      }),
      (R.prototype._toggleKey = function (e, t) {
        t
          ? (i.GPlatform.holdKey(e), this._heldKeys.set(e, !0))
          : (i.GPlatform.releaseKey(e), this._heldKeys.delete(e));
      }),
      (R.prototype._isHoldingKey = function (e) {
        return !!this._heldKeys && !!this._heldKeys.get(e);
      }),
      (R.prototype._keyDown = function (e) {
        I.includes(e.which || e.keyCode) &&
          ((this._keyState[e.which || e.keyCode] = !0), this._updateActions());
      }),
      (R.prototype._keyUp = function (e) {
        I.includes(e.which || e.keyCode) &&
          (delete this._keyState[e.which || e.keyCode], this._updateActions());
      }),
      (R.prototype._mouseup = function (e) {
        e.isTrusted &&
          (Object.keys(this._keyDownInveral).forEach((e) => {
            k("keyup", L[e]), clearInterval(this._keyDownInveral[e]);
          }),
          (this._keyDownInveral = []));
      }),
      (R.prototype.activate = function () {
        document.addEventListener("keydown", this._keyDownBound, !0),
          document.addEventListener("keyup", this._keyUpBound, !0),
          document.addEventListener("mouseup", this._mouseUpBound, !0),
          gDesigner.addEventListener(s.default, this._documentEvent, this),
          gDesigner.addEventListener(l.default, this._fullScreenEvent, this),
          i.GPlatform.addEventListener(
            i.GModifiersChangedEvent,
            this._modifiersChangedEvent,
            this
          ),
          this._activateDocument(gDesigner.getActiveDocument()),
          this._touchHandler.activate(this._htmlElement[0]),
          (this._heldKeys = new Map()),
          this._updateActions();
      }),
      (R.prototype.deactivate = function () {
        document.removeEventListener("keydown", this._keyDownBound, !0),
          document.removeEventListener("keyup", this._keyUpBound, !0),
          document.removeEventListener("mouseup", this._mouseUpBound, !0),
          gDesigner.removeEventListener(s.default, this._documentEvent, this),
          gDesigner.removeEventListener(l.default, this._fullScreenEvent, this),
          i.GPlatform.removeEventListener(
            i.GModifiersChangedEvent,
            this._modifiersChangedEvent,
            this
          ),
          this._deactivateDocument(gDesigner.getActiveDocument()),
          i.GPlatform.releaseKey(i.GKey.Constant.ALT_LEFT),
          i.GPlatform.releaseKey(i.GKey.Constant.ALT_RIGHT),
          i.GPlatform.releaseKey(i.GKey.Constant.SHIFT),
          i.GPlatform.releaseKey(i.GKey.Constant.CONTROL),
          this._touchHandler.deactivate(this._htmlElement[0]),
          (this._heldKeys = null);
      }),
      (R.prototype._activateDocument = function (e) {
        e &&
          e
            .getEditor()
            .addEventListener(
              a.GEditor.SelectionChangedEvent,
              this._selectionChangedEvent,
              this
            ),
          (this._document = e);
      }),
      (R.prototype._deactivateDocument = function (e) {
        e &&
          e
            .getEditor()
            .removeEventListener(
              a.GEditor.SelectionChangedEvent,
              this._selectionChangedEvent,
              this
            ),
          (this._document = null);
      }),
      (R.prototype._selectionChangedEvent = function (e) {
        this._updateActions();
      }),
      (R.prototype._fullScreenEvent = function () {
        this._updateActions();
      }),
      (R.prototype._modifiersChangedEvent = function () {
        this._updateActions();
      }),
      (R.prototype._documentEvent = function (e) {
        const t = e.document;
        if (!t.isLockedByVersionHistory())
          switch (e.type) {
            case s.default.Type.Activated:
              this._activateDocument(t), this._updateActions();
              break;
            case s.default.Type.Deactivated:
              this._deactivateDocument(t), this._updateActions();
              break;
            case s.default.Type.Modified:
              this._updateActions();
          }
      }),
      (R.prototype._updateActions = function () {
        this._htmlElement.find(".toolbar-button").each(function () {
          const e = $(this),
            t = e.data("action"),
            n = e.data("active");
          if (t) {
            const n = !t.isAvailable() || !t.isEnabled();
            e.find("button").prop("disabled", n).toggleClass("g-disabled", n);
          }
          n && e.toggleClass("g-active", !!n());
        });
      }),
      (R.prototype._isArrangeActionEnabled = function (e) {
        if (!gDesigner.getAction(C.default.ID + "." + e).isEnabled()) return !1;
        const t = this._document
          ? this._document.getEditor().getIndividualSelection()
          : null;
        if (!t) return !1;
        if (t.length > 1) return !0;
        const n = t[0],
          o = n.getParent();
        switch (e) {
          case a.GEditor.ArrangeOrderType.SendToFront:
            if (n.getNext()) {
              let e = n.getNext(),
                t = null;
              for (; !t && e; )
                e instanceof r.GElement && (t = e), (e = e.getNext());
              return !!t && a.GEditor.validateBlockInsertion(o, n);
            }
            return !1;
          case a.GEditor.ArrangeOrderType.BringForward: {
            let e = n.getNext();
            if (e) {
              let t = null;
              for (; !t && e; )
                e instanceof r.GElement &&
                  (e.hasFlag(r.GNode.Flag.Selected) || (t = e)),
                  (e = e.getNext());
              if (null !== t) {
                const e = t.getNext();
                return a.GEditor.validateBlockInsertion(o, n, e);
              }
            }
            return !1;
          }
          case a.GEditor.ArrangeOrderType.SendBackward: {
            let e = n.getPrevious();
            if (null !== e) {
              let t = null;
              for (; !t && e; )
                e instanceof r.GElement &&
                  (e.hasFlag(r.GNode.Flag.Selected) ||
                    (a.GEditor.validateBlockInsertion(o, n, e) && (t = e))),
                  (e = e.getPrevious());
              return !!t;
            }
            return !1;
          }
          case a.GEditor.ArrangeOrderType.SendToBack:
            if (null !== n.getPrevious()) {
              let e = o.getFirstChild(),
                t = null;
              for (; !t && e && e !== n; )
                e instanceof r.GElement &&
                  a.GEditor.validateBlockInsertion(o, n, e) &&
                  (t = e),
                  (e = e.getNext());
              return !!t;
            }
            return !1;
        }
        return !0;
      }),
      (R.prototype.getHtmlElement = function () {
        return this._htmlElement;
      }),
      (e.exports = R);
  }