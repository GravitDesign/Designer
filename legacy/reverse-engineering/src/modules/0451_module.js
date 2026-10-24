/**
 * Webpack Module #451
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    n(57), n(8), n(3), n(4), n(1352), n(13);
    var o = n(1),
      i = n(1709);
    function a() {}
    function r(e, t) {
      (this.id = e), (this.expanded = t);
    }
    function s(
      e,
      t,
      n,
      o,
      r,
      c,
      d,
      u,
      p,
      g,
      h,
      f,
      m,
      y,
      v,
      _,
      b,
      w,
      C,
      x,
      S,
      E,
      A
    ) {
      (this._root = new a()),
        (this._root.expanded = !0),
        (this._root.parent = this),
        (this._rootIndentation = x || 15),
        (this._indentation = S || 15),
        (this._bottomPadding = E || 0),
        i.call(this, e, t, 0, 0),
        this._container.classList.add("g-virtual-tree"),
        (this._rowStyle = n || s.DEFAULT_ROW_STYLE),
        (this._freeHeight = isNaN(d) ? s.DEFAULT_FREEZONE_HEIGHT : d),
        (this._insertIntoStyle = u || s.DEFAULT_INSERTINTO_STYLE),
        (this._upSeparatorSpan1Style = v || s.DEFAULT_UP_SEPARATOR_SPAN1_STYLE),
        (this._downSeparatorSpan1Style =
          b || s.DEFAULT_DOWN_SEPARATOR_SPAN1_STYLE),
        this._initComputedVals(),
        r && (this._expandStyle = r),
        o && (this._expandRenderer = o),
        c && (this._separatorRenderer = c),
        _ && (this._upSeparatorSpan2Style = _),
        w && (this._downSeparatorSpan2Style = w),
        p && (this._dropAllowedCallback = p),
        g && (this._dropCallback = g),
        h &&
          f &&
          ((this._isDuplicateEffectCallback = h),
          (this._duplicateCallback = f)),
        m && (this._clickCallback = m),
        y && (this._expandCallback = y),
        A && (this._renderFinishCallback = A),
        (this._putLastChildWhenInside = !!C),
        (this._aScroll = new l(this._container, 200, 10, null, 7)),
        (this._drag = this._drag.bind(this));
    }
    function l(e, t, n, o, i) {
      (this._elem = e),
        (this._scrollDelay = t || 30),
        (this._step = n || 1),
        (this._axisFlag = o || l.SCROLL_AXIS_FLAG.Y | l.SCROLL_AXIS_FLAG.X),
        (this._scAreaWidth = i || 5),
        this._fixupHandler("onmouseout", this.offScrolls.bind(this)),
        this._fixupHandler("ondragleave", this.offScrolls.bind(this));
    }
    (a._Change = { ExpandedSet: 1, ExpandedRemoved: 2 }),
      (a.prototype.parent = null),
      (a.prototype.previous = null),
      (a.prototype.next = null),
      (a.prototype.firstChild = null),
      (a.prototype.lastChild = null),
      (a.prototype.expanded = !1),
      (a.prototype.dragging = !1),
      (a.prototype.row = null),
      (a.prototype.acceptChildren = function (e, t, n, o) {
        var i,
          a = !o;
        if (!t || this.expanded)
          if (n)
            for (var r = this.lastChild; null != r; r = r.previous) {
              if (!1 === (i = r.accept(e, t, n, o)) && !o) return !1;
              !0 === i && o && (a = !0);
            }
          else
            for (r = this.firstChild; null != r; r = r.next) {
              if (!1 === (i = r.accept(e, t, n, o)) && !o) return !1;
              !0 === i && o && (a = !0);
            }
        return a;
      }),
      (a.prototype.accept = function (e, t, n, o) {
        return !1 !== e.call(null, this) && this.acceptChildren(e, t, n, o);
      }),
      (a.prototype.getNestLevel = function () {
        for (
          var e = 0, t = this.parent;
          null != t && t instanceof a;
          t = t.parent
        )
          ++e;
        return e;
      }),
      (a.prototype.isVisible = function () {
        for (var e = this.parent; e instanceof a; ) {
          if (!e.expanded) return !1;
          e = e.parent;
        }
        return !0;
      }),
      (a.prototype.handleChange = function (e, t) {
        (e != a._Change.ExpandedSet && e != a._Change.ExpandedRemoved) ||
          (this.parent && this.parent.handleChange(e, t));
      }),
      (a.prototype.handleExpand = function (e) {
        e.target.id === s.COLLAPSE_ID && this.expanded
          ? ((this.expanded = !1),
            this.handleChange(a._Change.ExpandedSet, this))
          : e.target.id !== s.EXPAND_ID ||
            this.expanded ||
            ((this.expanded = !0),
            this.handleChange(a._Change.ExpandedRemoved, this));
      }),
      (a.prototype.getNodeCount = function () {
        var e = 0;
        return (
          this.accept(function (t) {
            return ++e, !0;
          }, !1),
          e
        );
      }),
      (a.prototype.getBBox = function () {
        if (this.row) {
          const e = this.row.getBoundingClientRect();
          return new o.GRect(e.x, e.y, e.width, e.height);
        }
        return new o.GRect(0, 0, 0, 0);
      }),
      (a.prototype.getNextFocusableNode = function () {
        return this.expanded
          ? this.firstChild
          : this.next ||
              (this.parent && this.parent.next) ||
              (this.parent.row
                ? this.parent.parent.firstChild
                : this.parent.firstChild);
      }),
      (a.prototype.getPreviousFocusableNode = function () {
        return this.previous && this.previous.expanded
          ? this.previous.lastChild
          : !this.previous && this.parent.expanded && this.parent.row
          ? this.parent
          : this.previous ||
            (this.parent.lastChild.expanded
              ? this.parent.lastChild.lastChild
              : this.parent.lastChild);
      }),
      (a.prototype.setDragging = function (e) {
        this.accept((t) => {
          t.dragging = e;
        });
      }),
      (a.prototype.toString = function () {
        return "[GVirtualTreeNode]";
      }),
      (r.prototype = Object.create(a.prototype)),
      (r.prototype.id = null),
      (r.prototype.expanded = void 0),
      (s.DEFAULT_ROW_STYLE = "vrow"),
      (s.DEFAULT_INSERTINTO_STYLE = "insertInto"),
      (s.DEFAULT_LINE_HEIGHT = 30),
      (s.DEFAULT_FREEZONE_HEIGHT = 7),
      (s.DEFAULT_UP_SEPARATOR_SPAN1_STYLE = "up-separator-span1"),
      (s.DEFAULT_DOWN_SEPARATOR_SPAN1_STYLE = "down-separator-span1"),
      (s.COLLAPSE_ID = "clpsId"),
      (s.EXPAND_ID = "xpndId"),
      (s.ROW_ID = "rowId"),
      (s.LOWER_SEP_ID = "lsepId"),
      (s.UPPER_SEP_ID = "usepId"),
      (s.prototype = Object.create(i.prototype)),
      (s.IdxIterator = function (e, t, n, o) {
        (this._vtree = e),
          (this._firstIdx = t || 1),
          (this._lastIdx = o
            ? n && n <= this._vtree._rowCount
              ? n
              : this._vtree._rowCount
            : n && n <= this._vtree._nodeCount
            ? n
            : this._vtree._nodeCount),
          (this._visibleOnly = !!o);
      }),
      (s.IdxIterator.prototype._vtree = null),
      (s.IdxIterator.prototype._firstIdx = 0),
      (s.IdxIterator.prototype._lastIdx = 0),
      (s.IdxIterator.prototype._visibleOnly = !1),
      (s.IdxIterator.prototype._curNode = null),
      (s.IdxIterator.prototype._curIdx = 0),
      (s.IdxIterator.prototype.getFirstNode = function () {
        return (
          this._firstIdx <= this._lastIdx
            ? ((this._curIdx = this._firstIdx),
              (this._curNode = this._vtree._getNodeByIdx(
                this._curIdx,
                this._visibleOnly
              )))
            : ((this._curIdx = this._lastIdx + 1), (this._curNode = null)),
          this._curNode
        );
      }),
      (s.IdxIterator.prototype.getNext = function () {
        return this._curIdx
          ? ((this._curIdx =
              this._curIdx <= this._lastIdx ? this._curIdx + 1 : this._curIdx),
            this._curIdx <= this._lastIdx && this._curNode
              ? (this._curNode = this._vtree.getNextNode(
                  this._curNode,
                  this._visibleOnly
                ))
              : (this._curNode = null),
            this._curNode)
          : this.getFirstNode();
      }),
      (s.prototype._root = null),
      (s.prototype._nodeCount = 0),
      (s.prototype._rowStyle = null),
      (s.prototype._rootIndentation = 15),
      (s.prototype._indentation = 21),
      (s.prototype._bottomPadding = 0),
      (s.prototype._containerWidth = 0),
      (s.prototype._expandedWidth = 0),
      (s.prototype._expandStyle = null),
      (s.prototype._dragNodes = null),
      (s.prototype._freeHeight = 0),
      (s.prototype._upSeparatorStyle = null),
      (s.prototype._downSeparatorStyle = null),
      (s.prototype._insertIntoStyle = null),
      (s.prototype._downSepHeight = 0),
      (s.prototype._dropAllowedCallback = null),
      (s.prototype._dropCallback = null),
      (s.prototype._renderFinishCallback = null),
      (s.prototype._dragStartPt = null),
      (s.prototype._dragLastPt = null),
      (s.prototype._dragBBox = null),
      (s.prototype._dragNode = null),
      (s.prototype._dragAndDropHelper = null),
      (s.prototype._animatedDragEnabled = !1),
      (s.prototype._dragByMouse = !1),
      (s.prototype._isDuplicateEffectCallback = null),
      (s.prototype._duplicateCallback = null),
      (s.prototype._clickCallback = null),
      (s.prototype._expandCallback = null),
      (s.prototype._putLastChildWhenInside = !1),
      (s.prototype._invalidationRequestTimerId = null),
      (s.prototype._focusTimerId = null),
      (s.prototype._updateMarksTimerId = null),
      (s.prototype._aScroll = null),
      (s.prototype._freeZone = null),
      (s.prototype._lastVisitedDroppable = null),
      (s.prototype.endUpdate = function (e) {
        0 == --this._updateCounter && this.requestInvalidation(e);
      }),
      (s.prototype.refresh = function () {
        this._initComputedVals(), this.requestInvalidation(!0);
      }),
      (s.prototype.expandAndFocus = function (e, t) {
        for (var n = 0, o = e; o.parent && o.parent !== this._root; )
          (o = o.parent).expanded ||
            ((o.expanded = !0),
            this._expandCallback && this._expandCallback(o));
        if (this._focusTimerId) return !1;
        this._root.acceptChildren(function (t) {
          return t !== e && (n++, !0);
        }, !0),
          t || this.invalidate();
        var i = n * this._rowHeight,
          a = this._container.scrollTop;
        return (
          0 === this._visibleRows && this._updateVisibleRows(),
          (a > i || i - a >= this._rowHeight * this._visibleRows) &&
            (this._focusTimerId = setTimeout(
              function () {
                (this._container.scrollTop = i), (this._focusTimerId = null);
              }.bind(this, 50)
            )),
          !0
        );
      }),
      (s.prototype.requestInvalidation = function (e) {
        e
          ? this._updateCounter ||
            (this.invalidate(),
            this._renderFinishCallback && this._renderFinishCallback())
          : this._updateCounter ||
            (null === this._invalidationRequestTimerId &&
              (this._invalidationRequestTimerId = setTimeout(
                function () {
                  this.requestInvalidation(!0),
                    (this._invalidationRequestTimerId = null);
                }.bind(this),
                25
              )));
      }),
      (s.prototype.handleChange = function (e, t) {
        (e != a._Change.ExpandedSet && e != a._Change.ExpandedRemoved) ||
          this.requestInvalidation(!0);
      }),
      (s.prototype.invalidate = function () {
        this._updateRowCount(),
          this._updateVisibleRows(),
          this._updateScroller(),
          this._requestViewportClean(),
          this._render(),
          (this._lastRenderScrollTop = this._container.scrollTop);
      }),
      (s.prototype.getNextNode = function (e, t) {
        var n = e,
          o = null;
        if (t)
          for (; n.parent instanceof a && !n.parent.expanded; ) n = n.parent;
        if (
          (!n.firstChild || (t && !n.expanded) || (o = n.firstChild),
          !o && n.next && (o = n.next),
          !o)
        )
          for (
            var i = n.parent;
            !o && i instanceof a && i !== this._root;
            i = i.parent
          )
            i.next && (o = i.next);
        return o;
      }),
      (s.prototype.appendNode = function (e, t) {
        return this._insertNodeBefore(e || this._root, null, t);
      }),
      (s.prototype.prependNode = function (e, t) {
        return this._insertNodeBefore(
          e || this._root,
          e ? e.firstChild : this._root.firstChild,
          t
        );
      }),
      (s.prototype.insertNodeBefore = function (e, t) {
        return this._insertNodeBefore(e.parent, e, t);
      }),
      (s.prototype.insertNodeAfter = function (e, t) {
        return this._insertNodeBefore(e.parent, e.next ? e.next : null, t);
      }),
      (s.prototype.removeNode = function (e) {
        e.parent &&
          (e.parent.firstChild == e && (e.parent.firstChild = e.next),
          e.parent.lastChild == e && (e.parent.lastChild = e.previous)),
          null != e.previous && (e.previous.next = e.next),
          null != e.next && (e.next.previous = e.previous);
        var t = e.parent;
        t &&
          ((e.parent = null),
          (e.previous = null),
          (e.next = null),
          e.firstChild
            ? (this._nodeCount -= e.getNodeCount())
            : --this._nodeCount,
          e.expanded && e.firstChild
            ? this._updateRowCount()
            : t.expanded && --this._rowCount,
          t.expanded &&
            !t.firstChild &&
            t !== this._root &&
            t.expanded &&
            (t.handleChange(a._Change.ExpandedRemoved, t),
            (t.expanded = !1),
            this._expandCallback && this._expandCallback(t)),
          t.expanded && this.requestInvalidation());
      }),
      (s.prototype.clean = function () {
        (this._nodeCount = 0),
          (this._rowCount = 0),
          (this._root = new a()),
          (this._root.expanded = !0),
          (this._root.parent = this),
          (this._dragNodes = null),
          this.requestInvalidation(!0);
      }),
      (s.prototype.acceptChildren = function (e, t, n, o) {
        return this._root.acceptChildren(e, t, n, o);
      }),
      (s.prototype.getLastVisitedDroppable = function () {
        return this._lastVisitedDroppable;
      }),
      (s.prototype._updateScroller = function () {
        (this._scroller.style.height =
          (this._rowCount * this._rowHeight + this._freeHeight).toString() +
          "px"),
          this._scroller.scrollHeight < this._container.clientHeight
            ? (this._scroller.style.borderRight = "none")
            : (this._scroller.style.borderRight = "");
      }),
      (s.prototype._isDragging = function () {
        return !!this._dragNode;
      }),
      (s.prototype._renderViewport = function (e) {
        const t = !this.isAnimatedDragEnabled() || !this._isDragging();
        if (t) {
          (this._freeZone = null), (this._lastVisitedDroppable = null);
          for (var n = 1, o = this._container.childNodes.length; n < o; n++)
            (this._container.childNodes[n].style.display = "none"),
              this._container.childNodes[n].setAttribute("data-clean", "");
        }
        if (this._rowCount && this._renderer && this._rowHeight) {
          for (
            var i = Math.min(this._rowCount, e + this._cachedRows),
              a = document.createDocumentFragment(),
              r = new s.IdxIterator(this, e + 1, i, !0),
              l = e,
              c = r.getFirstNode();
            null != c;
            c = r.getNext(), ++l
          ) {
            const e = c.row;
            var d = !t && e ? e : document.createElement("div");
            (d.id = s.ROW_ID),
              d.classList.add(this._rowStyle),
              (d.style.top = (l * this._rowHeight).toString() + "px");
            var u =
              this._rootIndentation +
              this._indentation * (c.getNestLevel() - 1);
            if (
              ((d.style.paddingLeft = u.toString() + "px"),
              c.expanded || c.firstChild)
            ) {
              var p = document.createElement("span");
              c.expanded ? (p.id = s.COLLAPSE_ID) : (p.id = s.EXPAND_ID),
                this._expandStyle && p.classList.add(this._expandStyle),
                this._expandRenderer(p),
                (!t && e) || d.appendChild(p);
            }
            this.isAnimatedDragEnabled()
              ? (d.classList.add("g-drag-vrow"),
                d.classList.toggle("g-drag-mouse", !!this._dragByMouse),
                d.classList.toggle("g-dragging", !!c.dragging))
              : (d.classList.remove("g-drag-vrow"),
                d.classList.remove("g-drag-mouse"),
                d.classList.remove("g-dragging")),
              t || !e
                ? (d.addEventListener("click", this._nodeClick.bind(this, c)),
                  d.setAttribute("draggable", !0),
                  d.addEventListener(
                    "draginit",
                    this._nodeDragInit.bind(this, c)
                  ),
                  d.addEventListener(
                    "dragstart",
                    this._nodeDragStart.bind(this, c)
                  ),
                  d.addEventListener(
                    "dragend",
                    this._nodeDragEnd.bind(this, c)
                  ),
                  this.isAnimatedDragEnabled() ||
                    (d.addEventListener(
                      "dragenter",
                      this._nodeDragEnter.bind(this, c)
                    ),
                    d.addEventListener(
                      "dragover",
                      this._nodeDragOver.bind(this, c)
                    ),
                    d.addEventListener(
                      "dragleave",
                      this._nodeDragLeave.bind(this, c)
                    ),
                    d.addEventListener(
                      "dragexit",
                      this._nodeDragExit.bind(this, c)
                    ),
                    d.addEventListener("drop", this._nodeDrop.bind(this, c))),
                  (d._specCounter = 0),
                  (d._hasStyle = !1),
                  (c.row = d),
                  this._renderer(c, d),
                  a.appendChild(d))
                : t ||
                  (d.hasAttribute("data-clean") &&
                    (d.removeAttribute("data-clean"), (d.style.display = "")),
                  d.parentNode || a.appendChild(d));
          }
          if (i == this._rowCount && !this.isAnimatedDragEnabled()) {
            var g = document.createElement("div");
            (g.style.position = "absolute"),
              (g.style.height = this._freeHeight.toString() + "px"),
              (g.style.top = (i * this._rowHeight).toString() + "px"),
              g.addEventListener(
                "dragenter",
                this._nodeDragEnter.bind(this, this._root)
              ),
              g.addEventListener(
                "dragover",
                this._nodeDragOver.bind(this, this._root)
              ),
              g.addEventListener(
                "dragleave",
                this._nodeDragLeave.bind(this, this._root)
              ),
              g.addEventListener("drop", this._nodeDrop.bind(this, this._root)),
              a.appendChild(g),
              (this._freeZone = g);
          }
          this._container.appendChild(a),
            (this._expandedWidth = this._container.scrollWidth);
          for (n = 1, o = this._container.childNodes.length; n < o; n++)
            if ("none" !== this._container.childNodes[n].style.display) {
              getComputedStyle(this._container.childNodes[n]);
              this._container.childNodes[n].style.width =
                this._expandedWidth + "px";
            }
        }
      }),
      (s.prototype._initComputedVals = function () {
        this._containerWidth = parseInt(this._container.clientWidth);
        var e = document.createElement("div");
        e.classList.add(this._rowStyle),
          (e.style.visibility = "hidden"),
          this._container.appendChild(e);
        var t = getComputedStyle(e),
          n = parseInt(t.height);
        this._rowHeight = (n || 20) + this._bottomPadding;
        var o = document.createElement("div");
        o.classList.add(this._downSeparatorStyle),
          (o.style.display = "none"),
          e.appendChild(o),
          (this._downSepHeight = parseInt(getComputedStyle(o).height)),
          (this._expandedWidth = this._container.scrollWidth),
          this._container.removeChild(e);
      }),
      (s.prototype._insertNodeBefore = function (e, t, n) {
        return (
          (n.parent = e),
          null != t
            ? ((n.next = t),
              (n.previous = t.previous),
              (t.previous = n),
              null == n.previous ? (e.firstChild = n) : (n.previous.next = n))
            : (null != e.lastChild &&
                ((n.previous = e.lastChild),
                (e.lastChild.next = n),
                (e.lastChild = n)),
              (n.next = null)),
          null == e.firstChild &&
            ((e.firstChild = n), (n.previous = null), (n.next = null)),
          null == n.next && (e.lastChild = n),
          n.firstChild
            ? (this._nodeCount += n.getNodeCount())
            : ++this._nodeCount,
          n.expanded && n.firstChild
            ? this._updateRowCount()
            : e.expanded && ++this._rowCount,
          (e.expanded || (!e.expanded && e.firstChild == e.lastChild)) &&
            this.requestInvalidation(),
          this
        );
      }),
      (s.prototype._expandRenderer = function (e) {
        e.id === s.COLLAPSE_ID
          ? (e.innerHTML = "&#9660;")
          : e.id === s.EXPAND_ID && (e.innerHTML = "&#9658;");
      }),
      (s.prototype._separatorRenderer = function (e, t) {
        var n = this._expandedWidth || this._container.scrollWidth;
        (e.style.width = n.toString() + "px"),
          (e.style.height = this._freeHeight.toString() + "px"),
          (e.style.position = "absolute"),
          (e.style.pointerEvents = "none");
        var o = document.createElement("span"),
          i = null;
        e.id == s.UPPER_SEP_ID
          ? (o.classList.add(this._upSeparatorSpan1Style),
            (i = this._upSeparatorSpan2Style
              ? this._upSeparatorSpan2Style
              : null),
            (e.style.top = "0px"))
          : (o.classList.add(this._downSeparatorSpan1Style),
            (i = this._downSeparatorSpan2Style
              ? this._downSeparatorSpan2Style
              : null),
            (e.style.top =
              (this._rowHeight - this._freeHeight).toString() + "px")),
          e.appendChild(o);
        getComputedStyle(o);
        if (i) {
          var a = document.createElement("span");
          a.classList.add(i), e.appendChild(a);
        }
      }),
      (s.prototype._updateRowCount = function () {
        var e = 0;
        this._root.acceptChildren(function (t) {
          return ++e, !0;
        }, !0),
          (this._rowCount = e);
      }),
      (s.prototype._getNodeByIdx = function (e, t) {
        var n = 0,
          o = null;
        return (
          this._root.acceptChildren(function (t) {
            return ++n != e || ((o = t), !1);
          }, t),
          o
        );
      }),
      (s.prototype._nodeHasSomeParent = function (e, t) {
        for (var n = !1, o = e.parent; o && o instanceof a && !n; o = o.parent)
          n = o === t;
        return n;
      }),
      (s.prototype._nodeClick = function (e, t) {
        (!e.expanded && !e.firstChild) ||
        (t.target.id !== s.COLLAPSE_ID && t.target.id !== s.EXPAND_ID)
          ? this._clickCallback && (t.stopPropagation(), this._clickCallback(e))
          : (t.stopPropagation(),
            e.handleExpand(t),
            this._expandCallback && this._expandCallback(e));
      }),
      (s.prototype.setDragNodes = function (e) {
        e && e.length && (this._dragNodes = e.slice());
      }),
      (s.prototype.setAnimatedDragEnabled = function (e) {
        this._animatedDragEnabled !== e &&
          ((this._animatedDragEnabled = e), this.requestInvalidation(!0));
      }),
      (s.prototype.isAnimatedDragEnabled = function () {
        return this._animatedDragEnabled;
      }),
      (s.prototype._onScroll = function (e) {
        this.isAnimatedDragEnabled() && this._isDragging()
          ? e.preventDefault()
          : i.prototype._onScroll.call(this, e);
      }),
      (s.prototype._nodeDragInit = function (e, t) {
        this.isAnimatedDragEnabled() &&
          ((this._dragNode = e),
          (this._dragBBox = e.getBBox()),
          (this._dragStartPt = new o.GPoint(t.clientX, t.clientY)),
          (this._dragOffset = this._dragStartPt.subtract(
            this._dragBBox.getSide(o.GRect.Side.TOP_LEFT)
          )),
          (this._dragAndDropHelper = new s._DragAndDropHelper(this)));
      }),
      (s.prototype._nodeDragStart = function (e, t) {
        this._dragNodes || (this._dragNodes = [e]),
          t.dataTransfer.setData("text/plain", "some_dummy_data"),
          t.target.classList.add("g-drag"),
          this.isAnimatedDragEnabled()
            ? ((this._dragByMouse = !!t.isTrusted),
              this._dragNode || this._nodeDragInit(e, t),
              document.addEventListener("drag", this._drag, !0),
              e.setDragging(!0),
              this.requestInvalidation(!0))
            : this._aScroll.enableAScroll();
      }),
      (s.prototype._moveDown = function (e, t) {
        e !== this._dragNode &&
          this._dragAndDropHelper &&
          (Math.abs(t.getY()) > this._freeHeight
            ? this._canDropInside(e) &&
              this._dragAndDropHelper.setDroppableNodeInside(e)
            : this._canDropLower(e) &&
              this._dragAndDropHelper.setDroppableNodeLower(e));
      }),
      (s.prototype._moveUp = function (e, t) {
        e !== this._dragNode &&
          this._dragAndDropHelper &&
          (t.getY() > this._freeHeight
            ? this._canDropInside(e) &&
              this._dragAndDropHelper.setDroppableNodeInside(e)
            : this._canDropUpper(e) &&
              this._dragAndDropHelper.setDroppableNodeUpper(e));
      }),
      (s.prototype._canDropUpper = function (e) {
        const t = this._dragNode.row === this._freeZone;
        return (
          this._dropHereAllowed(e) && this._dropUpperAllowed(e, 0, null, t)
        );
      }),
      (s.prototype._canDropLower = function (e) {
        return (
          this._dropHereAllowed(e) && this._dropLowerAllowed(e, this._rowHeight)
        );
      }),
      (s.prototype._canDropInside = function (e) {
        return (
          this._dropHereAllowed(e) &&
          e !== this._root &&
          this._dropInsideAllowed(e)
        );
      }),
      (s.prototype._getOffset = function (e, t) {
        const n = e.getBBox().getSide(o.GRect.Side.TOP_LEFT);
        return t.getSide(o.GRect.Side.TOP_LEFT).subtract(n);
      }),
      (s.prototype._drag = function (e) {
        if (!this._dragAndDropHelper) return;
        const t = new o.GPoint(e.clientX, e.clientY),
          n = t.subtract(this._dragLastPt || this._dragStartPt),
          i = parseInt(n.getY());
        if (0 === i) return;
        this._dragLastPt = new o.GPoint(e.clientX, e.clientY);
        const a = t.subtract(this._dragOffset),
          r = new o.GRect(
            a.getX(),
            a.getY(),
            this._dragBBox.getWidth(),
            this._dragBBox.getHeight()
          ),
          s = [];
        this._root.acceptChildren((e) => {
          if (this._dragNode !== e)
            if (e.getBBox().intersectsRect(r)) s.push(e);
            else if (s.length > 0) return !1;
        }, !0),
          this._dragAndDropHelper.setDroppableNodeInside(null);
        const l = i > 0;
        if (1 === s.length) {
          const e = s[0],
            t = this._getOffset(e, r);
          l ? this._moveDown(e, t) : this._moveUp(e, t);
        } else if (2 === s.length)
          if (l) {
            const e = s[1],
              t = this._getOffset(e, r);
            this._moveDown(e, t);
          } else {
            const e = s[0],
              t = this._getOffset(e, r);
            this._moveUp(e, t);
          }
      }),
      (s.prototype._nodeDragEnd = function (e, t) {
        document.removeEventListener("drag", this._drag, !0),
          gDesigner.setItemDraggingState(!1),
          $(t.target).closest(".g-drag").removeClass("g-drag"),
          this.isAnimatedDragEnabled() &&
            (e.setDragging(!1),
            this._dragAndDropHelper.drop(),
            (this._dragNode = null),
            (this._dragAndDropHelper = null),
            this.expandAndFocus(e, !0),
            this.requestInvalidation(!0));
      }),
      (s.prototype._nodeDragEnter = function (e, t) {
        return (
          t.preventDefault(),
          t.stopPropagation(),
          gDesigner.setItemDraggingState(!0),
          this._updateMarksTimerId && clearTimeout(this._updateMarksTimerId),
          gDesigner.isTouchEnabled()
            ? this._updateMarks(e, t.currentTarget, t.layerY, !0)
            : (this._updateMarksTimerId = setTimeout(
                function (e, t, n) {
                  this._updateMarks(e, t, n, !0);
                }.bind(this, e, t.currentTarget, t.layerY),
                10
              )),
          (this._lastVisitedDroppable = t.currentTarget),
          !1
        );
      }),
      (s.prototype._nodeDragOver = function (e, t) {
        return (
          t.preventDefault(),
          t.stopPropagation(),
          this._updateMarksTimerId && clearTimeout(this._updateMarksTimerId),
          gDesigner.isTouchEnabled()
            ? this._updateMarks(e, t.currentTarget, t.layerY, !1)
            : (this._updateMarksTimerId = setTimeout(
                function (e, t, n) {
                  this._updateMarks(e, t, n, !1);
                }.bind(this, e, t.currentTarget, t.layerY),
                10
              )),
          this._aScroll.takeOnOffAction(t),
          !1
        );
      }),
      (s.prototype._nodeDragExit = function (e, t) {
        $(this._container).find(".g-drag").removeClass("g-no-drop");
      }),
      (s.prototype._nodeDragLeave = function (e, t) {
        return (
          t.preventDefault(),
          t.stopPropagation(),
          t.currentTarget._hasStyle &&
            (!t.currentTarget._specCounter || t.currentTarget._specCounter <= 1
              ? ((t.currentTarget._specCounter = 0),
                t.currentTarget.classList.remove(this._insertIntoStyle),
                this._rowRemoveSep(t.currentTarget, s.LOWER_SEP_ID),
                this._rowRemoveSep(t.currentTarget, s.UPPER_SEP_ID),
                this._aScroll.takeOnOffAction(t))
              : --t.currentTarget._specCounter),
          !1
        );
      }),
      (s.prototype._nodeDrop = function (e, t) {
        t.preventDefault(), t.stopPropagation();
        var n = this._lastVisitedDroppable
            ? this._lastVisitedDroppable
            : t.currentTarget,
          o = t.layerY;
        if (((n._specCounter = 0), this._dropHereAllowed(e))) {
          n.classList.remove(this._insertIntoStyle),
            this._rowRemoveSep(n, s.LOWER_SEP_ID),
            this._rowRemoveSep(n, s.UPPER_SEP_ID),
            (n._hasStyle = !1);
          var i = [],
            a = n === this._freeZone;
          if (this._dropUpperAllowed(e, o, i, a))
            if (
              (i.length || (i = this._dragNodes),
              this._isDuplicateEffectCallback &&
                this._isDuplicateEffectCallback(t))
            )
              e !== this._root
                ? this._duplicateCallback(
                    e.parent,
                    e,
                    e.previous ? e.previous : null,
                    i
                  )
                : this._duplicateCallback(
                    this._root,
                    null,
                    a ? e.lastChild : null,
                    i
                  );
            else {
              this.beginUpdate();
              for (var r = 0; r < i.length; ++r) this.removeNode(i[r]);
              if (e !== this._root) {
                this._dropCallback &&
                  this._dropCallback(
                    e.parent,
                    e,
                    e.previous ? e.previous : null,
                    i
                  );
                for (r = 0; r < i.length; ++r) this.insertNodeBefore(e, i[r]);
              } else {
                this._dropCallback &&
                  this._dropCallback(
                    this._root,
                    null,
                    a ? e.lastChild : null,
                    i
                  );
                for (r = 0; r < i.length; ++r) this.appendNode(e, i[r]);
              }
              (this._dragNodes = null), this.endUpdate();
            }
          else if (this._dropLowerAllowed(e, o, i))
            if (
              (i.length || (i = this._dragNodes),
              this._isDuplicateEffectCallback &&
                this._isDuplicateEffectCallback(t))
            )
              this._duplicateCallback(e.parent, e.next ? e.next : null, e, i);
            else {
              this.beginUpdate();
              for (r = 0; r < i.length; ++r) this.removeNode(i[r]);
              this._dropCallback &&
                this._dropCallback(e.parent, e.next ? e.next : null, e, i);
              for (r = i.length; r > 0; --r) this.insertNodeAfter(e, i[r - 1]);
              (this._dragNodes = null), this.endUpdate();
            }
          else if (this._dropInsideAllowed(e, i, a))
            if (
              (i.length || (i = this._dragNodes),
              this._isDuplicateEffectCallback &&
                this._isDuplicateEffectCallback(t))
            )
              this._duplicateCallback(e, null, null, i);
            else {
              this.beginUpdate();
              for (r = 0; r < i.length; ++r) this.removeNode(i[r]);
              if (
                (this._dropCallback &&
                  this._dropCallback(e, null, a ? e.lastChild : null, i),
                this._putLastChildWhenInside || a)
              )
                for (r = 0; r < i.length; ++r) this.appendNode(e, i[r]);
              else for (r = i.length; r > 0; --r) this.prependNode(e, i[r - 1]);
              (this._dragNodes = null), this.endUpdate();
            }
        }
        return (this._dragNodes = null), this._aScroll.disableAScroll(), !1;
      }),
      (s.prototype._dropHereAllowed = function (e) {
        for (
          var t = this._dragNodes && this._dragNodes.length, n = 0;
          t && n < this._dragNodes.length;
          ++n
        ) {
          var o = this._dragNodes[n];
          t = o !== e && !this._nodeHasSomeParent(e, o);
        }
        return t;
      }),
      (s.prototype._dropUpperAllowed = function (e, t, n, o) {
        var i =
          t <= this._freeHeight &&
          (this._dragNodes.length > 1 || e !== this._dragNodes[0].next);
        return (
          i &&
            this._dropAllowedCallback &&
            (i =
              (e !== this._root &&
                this._dropAllowedCallback(
                  e.parent,
                  e,
                  e.previous ? e.previous : null,
                  this._dragNodes,
                  n
                )) ||
              (e === this._root && this._dropInsideAllowed(e, n, o))),
          i
        );
      }),
      (s.prototype._dropLowerAllowed = function (e, t, n) {
        var o =
          t >= this._rowHeight - this._freeHeight &&
          !e.expanded &&
          e !== this._root &&
          (this._dragNodes.length > 1 || this._dragNodes[0] !== e.next);
        return (
          o &&
            this._dropAllowedCallback &&
            (o = this._dropAllowedCallback(
              e.parent,
              e.next ? e.next : null,
              e,
              this._dragNodes,
              n
            )),
          o
        );
      }),
      (s.prototype._dropInsideAllowed = function (e, t, n) {
        var o = n || this._putLastChildWhenInside,
          i =
            this._dragNodes.length > 1 ||
            !(
              this._dragNodes[0].parent === e &&
              ((o && e.lastChild === this._dragNodes[0]) ||
                (!o && e.firstChild === this._dragNodes[0]))
            );
        return (
          i &&
            this._dropAllowedCallback &&
            (i = this._dropAllowedCallback(
              e,
              o ? null : e.firstChild,
              o ? e.lastChild : null,
              this._dragNodes,
              t
            )),
          i
        );
      }),
      (s.prototype._drawUpperSeparator = function (e, t) {
        var n = e === this._root ? 0 : e.getNestLevel() - 1;
        this._rowAddSep(t, s.UPPER_SEP_ID, n);
      }),
      (s.prototype._drawLowerSeparator = function (e, t) {
        var n = e.getNestLevel() - 1;
        this._rowAddSep(t, s.LOWER_SEP_ID, n);
      }),
      (s.prototype._updateMarks = function (e, t, n, o) {
        let i = !0;
        if (this._dropHereAllowed(e)) {
          var a = t === this._freeZone;
          this._dropUpperAllowed(e, n, null, a)
            ? ((i = !1),
              this._rowHasSep(t, s.UPPER_SEP_ID) ||
                (this._rowRemoveSep(t, s.LOWER_SEP_ID),
                (t._specCounter = 0),
                t.classList.remove(this._insertIntoStyle),
                this._drawUpperSeparator(e, t)))
            : this._dropLowerAllowed(e, n)
            ? ((i = !1),
              this._rowHasSep(t, s.LOWER_SEP_ID) ||
                (this._rowRemoveSep(t, s.UPPER_SEP_ID),
                (t._specCounter = 0),
                t.classList.remove(this._insertIntoStyle),
                this._drawLowerSeparator(e, t)))
            : e !== this._root &&
              this._dropInsideAllowed(e) &&
              ((i = !1),
              this._rowRemoveSep(t, s.LOWER_SEP_ID),
              this._rowRemoveSep(t, s.UPPER_SEP_ID),
              t.classList.add(this._insertIntoStyle),
              (t._hasStyle = !0),
              o && (t._specCounter ? ++t._specCounter : (t._specCounter = 1)));
        }
        $(this._container).find(".g-drag").toggleClass("g-no-drop", i);
      }),
      (s.prototype._rowHasSep = function (e, t) {
        for (var n = 1, o = e.childNodes.length; n < o; n++)
          if (e.childNodes[n].id === t) return !0;
        return !1;
      }),
      (s.prototype._rowAddSep = function (e, t, n) {
        var o = document.createElement("div");
        (o.id = t),
          this._separatorRenderer(o, n),
          t == s.UPPER_SEP_ID
            ? e.insertBefore(o, e.firstChild)
            : e.appendChild(o),
          (e._hasStyle = !0);
      }),
      (s.prototype._rowRemoveSep = function (e, t) {
        for (var n = e.childNodes.length - 1; n >= 0; --n)
          e.childNodes[n].id === t && e.removeChild(e.childNodes[n]);
      }),
      (s.prototype.resetRowHeight = function (e) {
        this._rowHeight = e;
      }),
      (s.prototype.setFreeHeight = function (e) {
        this._freeHeight = e;
      }),
      (s.prototype.toString = function () {
        return "[GVirtualTree]";
      }),
      (l.AUTO_SCROLL_Y = { OFF: 0, UP: 1, DOWN: 2 }),
      (l.AUTO_SCROLL_X = { OFF: 0, LEFT: 1, RIGHT: 2 }),
      (l.SCROLL_AXIS_FLAG = { X: 1, Y: 2 }),
      (l.prototype._elem = null),
      (l.prototype._timerId = null),
      (l.prototype._scrollDelay = null),
      (l.prototype._step = null),
      (l.prototype._axisFlag = null),
      (l.prototype._scAreaWidth = 0),
      (l.prototype._aScrollEnabled = !1),
      (l.prototype._aScrollY = l.AUTO_SCROLL_Y.OFF),
      (l.prototype._aScrollX = l.AUTO_SCROLL_X.OFF),
      (l.prototype.enableAScroll = function () {
        (this._aScrollEnabled = !0),
          (this._timerId = setInterval(
            this._tryScroll.bind(this),
            this._scrollDelay
          ));
      }),
      (l.prototype.disableAScroll = function () {
        (this._aScrollEnabled = !1),
          this._timerId &&
            (clearInterval(this._timerId), (this._timerId = null));
      }),
      (l.prototype.takeOnOffAction = function (e) {
        if (this._aScrollEnabled) {
          if (e.layerY == e.clientY || e.layerX == e.clientX)
            return (
              (this._aScrollY = l.AUTO_SCROLL_Y.OFF),
              void (this._aScrollX = l.AUTO_SCROLL_X.OFF)
            );
          for (
            var t = e.layerY, n = e.layerX, o = e.target;
            o != this._elem && o;
            o = o.offsetParent ? o.offsetParent : o.parentNode
          )
            o.offsetParent && ((t += o.offsetTop), (n += o.offsetLeft));
          if (!o) return;
          (t -= this._elem.scrollTop),
            (n -= this._elem.scrollLeft),
            this._axisFlag & l.SCROLL_AXIS_FLAG.Y &&
              n > 0 &&
              n < this._elem.offsetWidth &&
              (t <= this._scAreaWidth
                ? (this._aScrollY = l.AUTO_SCROLL_Y.UP)
                : t >= this._elem.offsetHeight - this._scAreaWidth
                ? (this._aScrollY = l.AUTO_SCROLL_Y.DOWN)
                : (this._aScrollY = l.AUTO_SCROLL_Y.OFF)),
            this._axisFlag & l.SCROLL_AXIS_FLAG.X &&
              t > 0 &&
              t < this._elem.offsetHeight &&
              (n <= this._scAreaWidth
                ? (this._aScrollX = l.AUTO_SCROLL_X.LEFT)
                : n >= this._elem.offsetWidth - this._scAreaWidth
                ? (this._aScrollX = l.AUTO_SCROLL_X.RIGHT)
                : (this._aScrollX = l.AUTO_SCROLL_X.OFF));
        }
      }),
      (l.prototype.offScrolls = function (e) {
        e.target === this._elem &&
          ((this._aScrollY = l.AUTO_SCROLL_Y.OFF),
          (this._aScrollX = l.AUTO_SCROLL_X.OFF));
      }),
      (l.prototype._tryScroll = function () {
        if (
          this._aScrollY !== l.AUTO_SCROLL_Y.OFF ||
          this._aScrollX !== l.AUTO_SCROLL_X.OFF
        ) {
          if (this._aScrollY) {
            var e = this._aScrollY == l.AUTO_SCROLL_Y.UP ? -1 : 1;
            this._elem.scrollTop += this._step * e;
          }
          if (this._aScrollX) {
            var t = this._aScrollX == l.AUTO_SCROLL_X.LEFT ? -1 : 1;
            this._elem.scrollLeft += this._step * t;
          }
        }
      }),
      (l.prototype._fixupHandler = function (e, t) {
        var n, o;
        this._elem[e]
          ? (this._elem[e] =
              ((n = t),
              (o = this._elem[e]),
              function () {
                return n.apply(this, arguments), o.apply(this, arguments);
              }))
          : (this._elem[e] = t);
      }),
      n(1710)(s),
      (e.exports.GVirtualTreeNode = a),
      (e.exports.GVirtualTreeNodeNamed = r),
      (e.exports.GVirtualTree = s);
  }